import { AuthMenu } from "@/components/auth-menu"

export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-end px-4 pt-4 sm:px-6">
        <div className="pointer-events-auto">
          <AuthMenu />
        </div>
      </div>
      {children}
    </>
  )
}
