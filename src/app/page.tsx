import { auth } from "../lib/auth"
import { redirect } from "next/navigation"

export default async function HomePage() {
  // Getting the user session
  const session = await auth()
  
  if (session) {
    redirect("/dashboard")
  } else {
    redirect("/auth/login")
  }
}
