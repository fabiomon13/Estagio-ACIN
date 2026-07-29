import { AvatarIcon } from '../../icons';
import ChevronIcon from '../../icons/ChevronIcon';
import type { ProfileMenuTriggerProps } from './ProfileMenuTrigger.types';
import { profileMenuTriggerStyles as styles } from './ProfileMenuTrigger.styles';

export default function ProfileMenuTrigger({
  name,
  onClick,
  role,
  profileImageUrl,
}: ProfileMenuTriggerProps) {
  const roleLabel = role === 'chef' ? 'Cozinheiro' : role === 'admin' ? 'Administrador' : 'Garçom';

  return (
    <button type="button" onClick={onClick} className={styles.trigger}>
      <div className={styles.content}>
        {profileImageUrl ? (
          <img src={profileImageUrl} alt={`Fotografia de ${name}`} className={styles.avatarImage} />
        ) : (
          <AvatarIcon className={styles.avatarIcon} />
        )}

        <div className={styles.textWrapper}>
          <span className={styles.role}>{roleLabel}</span>
          <span className={styles.name}>{name}</span>
        </div>
      </div>

      <span className={styles.chevronWrapper}>
        <ChevronIcon />
      </span>
    </button>
  );
}
