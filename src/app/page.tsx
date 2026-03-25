import { redirect } from 'next/navigation'

// Página raiz redireciona para o dashboard
export default function Home() {
  redirect('/dashboard')
}
