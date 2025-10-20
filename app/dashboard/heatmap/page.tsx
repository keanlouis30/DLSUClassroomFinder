import { redirect } from 'next/navigation'

// Heat map is now the main dashboard view
export default async function HeatMapPage() {
  // Redirect to main dashboard which now shows the heat map
  redirect('/dashboard')
}

