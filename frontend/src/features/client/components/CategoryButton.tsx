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
      onClick={onClick}
      className={`client-category-button ${selected ? 'is-active' : ''}`}
      aria-current={selected ? 'true' : undefined}
    >
      {label}
    </button>
  );
}
