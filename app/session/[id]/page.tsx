import { SessionClient } from './SessionClient'

export default async function SessionPage(props: PageProps<'/session/[id]'>) {
  const { id } = await props.params
  return <SessionClient sessionId={id} />
}
