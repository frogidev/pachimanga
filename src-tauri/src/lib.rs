use std::time::Duration;

use reqwest::{redirect::Policy, Client, StatusCode, Url};

const BASE: &str = "https://weebcentral.com";

fn valid_id(value: &str) -> bool {
    let len = value.len();
    (20..=32).contains(&len)
        && value
            .bytes()
            .all(|byte| byte.is_ascii_uppercase() || byte.is_ascii_digit())
}

fn clean_query(value: &str) -> Result<String, String> {
    let normalized = value
        .chars()
        .map(|ch| if ch.is_alphanumeric() || ch.is_whitespace() { ch } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");

    if normalized.is_empty() {
        return Err("Search query is empty.".into());
    }
    if normalized.chars().count() > 100 {
        return Err("Search query is too long.".into());
    }
    Ok(normalized)
}

fn checked_id(id: Option<String>) -> Result<String, String> {
    let value = id.ok_or_else(|| "Missing WeebCentral identifier.".to_string())?;
    if !valid_id(&value) {
        return Err("Invalid WeebCentral identifier.".into());
    }
    Ok(value)
}

fn client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(12))
        .redirect(Policy::limited(3))
        .user_agent("Pachimanga-Native/0.4 (+https://pachimanga.frogilab.dev)")
        .build()
        .map_err(|error| format!("Unable to initialize native HTTP client: {error}"))
}

#[tauri::command]
async fn weebcentral_request(
    operation: String,
    query: Option<String>,
    id: Option<String>,
) -> Result<String, String> {
    let http = client()?;
    let mut referer: Option<String> = None;
    let mut hx_target: Option<&'static str> = None;

    let url = match operation.as_str() {
        "health" => Url::parse(BASE).map_err(|error| error.to_string())?,
        "search" => {
            let query = clean_query(query.as_deref().unwrap_or_default())?;
            let mut search_url = Url::parse(&format!("{BASE}/search/data"))
                .map_err(|error| error.to_string())?;
            search_url
                .query_pairs_mut()
                .append_pair("text", &query)
                .append_pair("sort", "Best Match")
                .append_pair("order", "Descending")
                .append_pair("official", "Any")
                .append_pair("anime", "Any")
                .append_pair("adult", "Any")
                .append_pair("display_mode", "Full Display")
                .append_pair("offset", "0");

            let mut ref_url = Url::parse(&format!("{BASE}/search"))
                .map_err(|error| error.to_string())?;
            ref_url.query_pairs_mut().append_pair("text", &query);
            referer = Some(ref_url.to_string());
            search_url
        }
        "manga" => {
            let id = checked_id(id)?;
            Url::parse(&format!("{BASE}/series/{id}")).map_err(|error| error.to_string())?
        }
        "chapters" => {
            let id = checked_id(id)?;
            referer = Some(format!("{BASE}/series/{id}"));
            hx_target = Some("chapter-list");
            Url::parse(&format!("{BASE}/series/{id}/full-chapter-list"))
                .map_err(|error| error.to_string())?
        }
        "chapter" => {
            let id = checked_id(id)?;
            Url::parse(&format!("{BASE}/chapters/{id}")).map_err(|error| error.to_string())?
        }
        "pages" => {
            let id = checked_id(id)?;
            referer = Some(format!("{BASE}/chapters/{id}"));
            hx_target = Some("chapter-images");
            Url::parse(&format!(
                "{BASE}/chapters/{id}/images?is_prev=False&reading_style=long_strip&current_page=1"
            ))
            .map_err(|error| error.to_string())?
        }
        _ => return Err("Unsupported native WeebCentral operation.".into()),
    };

    let mut request = http
        .get(url)
        .header("accept", "text/html,application/xhtml+xml");

    if let Some(referer_value) = referer {
        request = request
            .header("referer", &referer_value)
            .header("hx-request", "true")
            .header("hx-current-url", referer_value);
    }
    if let Some(target) = hx_target {
        request = request.header("hx-target", target);
    }

    let response = request
        .send()
        .await
        .map_err(|error| format!("WeebCentral network request failed: {error}"))?;
    let status = response.status();

    if status == StatusCode::FORBIDDEN {
        return Err("WeebCentral HTTP 403; access was refused from this device.".into());
    }
    if status == StatusCode::TOO_MANY_REQUESTS {
        return Err("WeebCentral rate limited this device; try again later.".into());
    }
    if !status.is_success() {
        return Err(format!("WeebCentral HTTP {}.", status.as_u16()));
    }

    if operation == "health" {
        return Ok("ok".into());
    }

    response
        .text()
        .await
        .map_err(|error| format!("Unable to read WeebCentral response: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![weebcentral_request])
        .run(tauri::generate_context!())
        .expect("error while running Pachimanga native");
}
