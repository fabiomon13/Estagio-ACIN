import { getCategoryConfig, MAX_ITEM_QUANTITY } from '../../clientConfig';
import type { MenuItem } from '../../services/menuApi';
import { MenuItemImage } from '../shared/MenuItemImage';

type SelectionItemProps = {
  item: MenuItem;
  quantity: number;
  hasAllergyWarning: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onDelete: () => void;
};

export function SelectionItem({
  item,
  quantity,
  hasAllergyWarning,
  onAdd,
  onRemove,
  onDelete,
}: SelectionItemProps) {
  const category = getCategoryConfig(item.category.alias, item.category.name);

  return (
    <article className="client-selection-item">
      <div className="client-selection-thumbnail" aria-hidden={!item.photo_url}>
        <MenuItemImage
          src={item.photo_url}
          alt=""
          fallback={<span aria-hidden="true">{category.emoji}</span>}
        />
      </div>

      <strong>{item.name}</strong>

      <div className="client-selection-quantity">
        <button type="button" aria-label={`Remover uma unidade de ${item.name}`} onClick={onRemove}>
          −
        </button>

        <output aria-label={`${quantity} unidades`}>{quantity}</output>

        <button
          type="button"
          className={['is-add', hasAllergyWarning ? 'is-allergy-warning' : '']
            .filter(Boolean)
            .join(' ')}
          disabled={quantity >= MAX_ITEM_QUANTITY}
          aria-label={
            hasAllergyWarning
              ? `Adicionar mais uma unidade de ${item.name}; aviso de alergia`
              : `Adicionar mais uma unidade de ${item.name}`
          }
          onClick={onAdd}
        >
          +
        </button>
      </div>

      <button
        type="button"
        className="client-selection-delete"
        aria-label={`Remover ${item.name} da seleção`}
        onClick={onDelete}
      >
        ×
      </button>
    </article>
  );
}
