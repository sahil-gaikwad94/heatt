import { forwardRef, type ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

/* ============================================================
   HEATT · DIALOG PRIMITIVE (Radix UI + Tailwind)
   Accessible by default: focus trap, scroll lock, Escape,
   aria wiring. Animated through data-state keyframes in
   tailwind.css so it respects reduced-motion.
   ============================================================ */

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn('dialog-overlay fixed inset-0 z-50 bg-black/55 backdrop-blur-[6px]', className)}
      {...props}
    />
  )
}

export const DialogContent = forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof DialogPrimitive.Content> & { wide?: boolean; hideClose?: boolean }
>(function DialogContent({ className, children, wide, hideClose, ...props }, ref) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          'dialog-content fixed left-1/2 top-1/2 z-50 w-[min(100vw-2rem,560px)] max-h-[min(92vh,860px)] -translate-x-1/2 -translate-y-1/2',
          'overflow-hidden rounded-[26px] border border-line bg-card shadow-lift outline-none',
          wide && 'w-[min(100vw-2rem,760px)]',
          className,
        )}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-line bg-card-glass text-ink-soft backdrop-blur transition hover:border-ember hover:text-ember"
            aria-label="Close"
          >
            <X size={17} strokeWidth={2} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})

export function DialogHeader({ eyebrow, title, note, dark }: { eyebrow?: string; title: ReactNode; note?: ReactNode; dark?: boolean }) {
  return (
    <header className={cn('grid gap-1.5 px-7 pb-4 pt-7', dark && 'bg-night text-night-text')}>
      {eyebrow && (
        <span className={cn('font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ember', dark && 'text-gold')}>
          {eyebrow}
        </span>
      )}
      <h2 className={cn('font-display text-[26px] font-bold leading-[1.08] tracking-[-0.03em] text-ink', dark && 'text-night-text')}>
        {title}
      </h2>
      {note && <p className={cn('max-w-[54ch] text-[12.5px] leading-relaxed text-ink-soft', dark && 'text-night-copy')}>{note}</p>}
    </header>
  )
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'footer'>) {
  return <footer className={cn('flex items-center justify-end gap-2.5 border-t border-line px-7 py-4', className)} {...props} />
}
