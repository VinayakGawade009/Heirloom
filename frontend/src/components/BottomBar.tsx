export interface BottomBarProps {
  name: string;
}

export function BottomBar({ name }: BottomBarProps) {
  return (
    <footer className="border-t border-rule bg-canvas px-8 py-3 flex items-center justify-between font-mono text-[13px] text-muted">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-success" aria-hidden="true" />
        <span>Running on this computer. No internet needed.</span>
      </div>
      <div className="font-mono text-muted">
        Model: {name}
      </div>
    </footer>
  );
}

export default BottomBar;
