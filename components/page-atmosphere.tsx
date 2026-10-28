/** 全站轻量渐变背景，不挡交互 */
export function PageAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="bg-atmosphere absolute inset-0" />
      <div className="absolute -top-40 -right-32 size-[min(90vw,28rem)] rounded-full bg-primary/20 blur-3xl dark:bg-primary/15" />
      <div className="absolute top-[38%] -left-24 size-72 rounded-full bg-sky-400/25 blur-3xl dark:bg-sky-500/15" />
      <div className="absolute -bottom-20 right-[10%] size-64 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/10" />
    </div>
  )
}
