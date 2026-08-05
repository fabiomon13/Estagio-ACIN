type CategoryButtonProps = {
  categoryId: number;
  label: string;
  selected: boolean;
  onClick: () => void;
};

export function CategoryButton({ categoryId, label, selected, onClick }: CategoryButtonProps) {
  return (
    <button
      type="button"
      data-category-id={categoryId}
      onClick={onClick}
      className={`client-category-button ${selected ? 'is-active' : ''}`}
      aria-current={selected ? 'true' : undefined}
    >
      {label}
    </button>
  );
}
