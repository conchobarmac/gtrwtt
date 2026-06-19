import { AdminSessionClient } from './AdminSessionClient'

export default async function AdminSessionPage(props: PageProps<'/admin/sessions/[id]'>) {
  const { id } = await props.params
  return <AdminSessionClient sessionId={id} />
}
