// src/components/AvatarLink.jsx
import { Link } from 'wouter';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@/context/UserContext';

const AvatarLink = () => {
  const { user } = useUser();

  const profilePath =
    user?.role === 'merchant'
      ? '/merchant-profile'
      : user?.role === 'admin'
      ? '/admin-profile'
      : user?.role === 'clerk'
      ? '/clerks-profile'
      : user?.role === 'cashier'
      ? '/cashier-profile'
      :'/';

  return (
    <Link href={profilePath} title="View Profile">
      <Avatar className="cursor-pointer">
        <AvatarImage src={user.avatar || "/default-avatar.jpg"} alt={user.name || "User"} />
        <AvatarFallback>
          {user?.name ? user.name.charAt(0).toUpperCase() : "?"}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
};

export default AvatarLink;
