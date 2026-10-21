export type PanchangIdentityKind = 'authenticated' | 'guest' | 'unauthenticated' | 'loading';

/** Keep identity transitions guarded while allowing local Panchang to paint during revalidation. */
export function shouldBlockPanchangScreen(input: {
  panchangOwner: string | null;
  cacheIdentity: string | null;
  identityKind: PanchangIdentityKind;
}): boolean {
  return input.panchangOwner !== input.cacheIdentity ||
    input.identityKind === 'unauthenticated' ||
    input.identityKind === 'loading';
}
