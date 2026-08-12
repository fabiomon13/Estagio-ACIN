// frontend/src/features/client/clientConfig.ts

export {
  categoryConfig,
  getCategoryConfig,
  getCategoryOrder,
  getStationOrder,
  type CategoryConfig,
  type KnownCategoryAlias,
} from './config/categories';

export { getTagConfig, tagConfig, type KnownTagAlias, type TagConfig } from './config/tags';

export {
  CLIENT_REALTIME_MAX_RECONNECT_DELAY_MS,
  CLIENT_SWIPE_TRANSITION_MS,
  MAX_ITEM_QUANTITY,
  MAX_NOTES_LENGTH,
} from './config/constants';

export { formatPrice } from './utils/formatPrice';
