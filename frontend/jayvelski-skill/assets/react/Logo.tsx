export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`text-[20px] tracking-[-0.4px] text-ink ${className}`}>
      <span className="font-semibold">microdose</span>
      <span className="font-light">.studio</span>
    </span>
  )
}
