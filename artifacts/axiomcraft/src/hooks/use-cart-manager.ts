import { useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useCartSession } from '../store/use-cart-session';
import { 
  useGetCart, 
  useAddToCart, 
  useUpdateCartItem, 
  useClearCart,
  getGetCartQueryKey,
} from '@workspace/api-client-react';
import type { CartResponse } from '@workspace/api-client-react';

async function deleteCartItem(itemId: number, sessionId: string): Promise<CartResponse> {
  const url = `/api/cart/${itemId}?sessionId=${encodeURIComponent(sessionId)}`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error((err as { message?: string }).message ?? 'Failed to remove cart item');
  }
  return res.json() as Promise<CartResponse>;
}

export function useCartManager() {
  const queryClient = useQueryClient();
  const { sessionId, initSession } = useCartSession();

  useEffect(() => {
    initSession();
  }, [initSession]);

  const queryKey = getGetCartQueryKey({ sessionId });

  const cartQuery = useGetCart(
    { sessionId },
    { query: { queryKey, enabled: !!sessionId } }
  );

  const invalidateCart = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const addMutation = useAddToCart({
    mutation: { onSuccess: invalidateCart }
  });

  const updateMutation = useUpdateCartItem({
    mutation: { onSuccess: invalidateCart }
  });

  const removeMutation = useMutation<CartResponse, Error, { itemId: number; sessionId: string }>({
    mutationFn: ({ itemId, sessionId: sid }) => deleteCartItem(itemId, sid),
    onSuccess: invalidateCart,
  });

  const clearMutation = useClearCart({
    mutation: { onSuccess: invalidateCart }
  });

  const addToCart = async (productId: number, quantity: number, variantId?: number) => {
    if (!sessionId) return;
    await addMutation.mutateAsync({
      data: { sessionId, productId, quantity, variantId }
    });
  };

  const updateQuantity = async (itemId: number, quantity: number) => {
    if (!sessionId) return;
    await updateMutation.mutateAsync({
      itemId,
      data: { sessionId, quantity }
    });
  };

  const removeItem = async (itemId: number) => {
    if (!sessionId) return;
    await removeMutation.mutateAsync({ itemId, sessionId });
  };

  const clearCart = async () => {
    if (!sessionId) return;
    await clearMutation.mutateAsync({ params: { sessionId } });
  };

  return {
    cart: cartQuery.data,
    isLoading: cartQuery.isLoading,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending || removeMutation.isPending,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    itemCount: cartQuery.data?.itemCount || 0,
    subtotal: cartQuery.data?.subtotal || 0,
  };
}
