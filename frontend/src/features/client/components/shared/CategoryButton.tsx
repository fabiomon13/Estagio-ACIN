type CategoryButtonProps = {
  categoryAlias: string;
  label: string;
  selected: boolean;
  onClick: () => void;
};

export function CategoryButton({ categoryAlias, label, selected, onClick }: CategoryButtonProps) {
  return (
    <button
      type="button"
      data-category-alias={categoryAlias}
      className={['client-category-button', selected ? 'is-active' : ''].filter(Boolean).join(' ')}
      aria-current={selected ? 'true' : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
