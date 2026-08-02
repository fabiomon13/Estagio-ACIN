type LoaderProps = {
  label?: string;
};

export default function Loader({ label }: LoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-10">
      <div className="relative size-11">
        <span className="absolute inset-0 rounded-full border-[3px] border-border" />
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary drop-shadow-[0_0_6px_rgba(255,87,87,0.45)]" />
      </div>

      {label && <span className="animate-fade-up text-sm text-content-subtle">{label}</span>}
    </div>
  );
}
