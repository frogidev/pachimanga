import { AuthForm } from '@/components/AuthForm';
import { PageHeading } from '@/components/page-heading';
export default function AuthPage(){return <div className="mx-auto max-w-xl p-4 sm:p-8"><PageHeading eyebrow="Account" title="Welcome to Pachimanga" description="Create an account to sync your library and progress across your devices."/><AuthForm/></div>}
