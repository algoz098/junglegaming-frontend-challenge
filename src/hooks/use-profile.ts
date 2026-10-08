import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '@/api/endpoints';
import { queryKeys } from '@/api/queryKeys';
import { getSessionToken } from '@/api/client';
import type { PasswordChangePayload, ProfileUpdatePayload, SessionInfo, User } from '@/types';

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: () => profileApi.me(),
    enabled: Boolean(getSessionToken()),
    staleTime: 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProfileUpdatePayload) => profileApi.update(payload),
    onSuccess: (user: User) => {
      qc.setQueryData(queryKeys.profile(), user);
      qc.setQueryData(queryKeys.session(), (old: SessionInfo | undefined) =>
        old ? { ...old, user: { ...old.user, ...user } } : old,
      );
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: PasswordChangePayload) => profileApi.changePassword(payload),
  });
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: ({ url }) => {
      qc.setQueryData(queryKeys.profile(), (old: User | undefined) => (old ? { ...old, avatarUrl: url } : old));
    },
  });
}