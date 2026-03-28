'use client';

import Image from 'next/image';
import { Gender } from '@/lib/types';

type UserRole = 'student' | 'teacher' | 'admin';

interface UserAvatarProps {
  firstName: string;
  lastName: string;
  gender?: Gender;
  profilePhoto?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showGenderBadge?: boolean;
  role?: UserRole;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-xl',
};

const sizePixels = {
  sm: 32,
  md: 40,
  lg: 64,
};

const badgeSizeClasses = {
  sm: 'w-3 h-3 -bottom-0.5 -right-0.5',
  md: 'w-4 h-4 -bottom-0.5 -right-0.5',
  lg: 'w-5 h-5 bottom-0 right-0',
};

function getRoleBorderClass(role?: UserRole, gender?: Gender): string {
  if (role === 'admin') {
    return 'border-2 border-green-500';
  }
  if (role === 'teacher') {
    if (gender === 'male') {
      return 'border-2 border-blue-500';
    }
    if (gender === 'female') {
      return 'border-2 border-pink-500';
    }
    return 'border-2 border-blue-500';
  }
  return 'border-2 border-primary/20';
}

export default function UserAvatar({
  firstName,
  lastName,
  gender,
  profilePhoto,
  size = 'md',
  showGenderBadge = true,
  role,
  className = '',
}: UserAvatarProps) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  const storageUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
  const borderClass = getRoleBorderClass(role, gender);
  const photoUrl = profilePhoto?.startsWith('http')
    ? profilePhoto
    : profilePhoto ? `${storageUrl}/storage/${profilePhoto}` : null;

  return (
    <div className={`relative inline-block ${className}`}>
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={`${firstName} ${lastName}`}
          width={sizePixels[size]}
          height={sizePixels[size]}
          className={`${sizeClasses[size]} rounded-full object-cover ${borderClass}`}
          unoptimized
        />
      ) : (
        <div
          className={`${sizeClasses[size]} bg-primary/10 rounded-full flex items-center justify-center ${borderClass}`}
        >
          <span className="text-primary font-bold">{initials}</span>
        </div>
      )}

      {/* Gender Badge */}
      {showGenderBadge && gender && (
        <span
          className={`absolute ${badgeSizeClasses[size]} rounded-full border-2 border-white ${
            gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
          }`}
          title={gender === 'male' ? 'Homme' : 'Femme'}
        />
      )}
    </div>
  );
}
