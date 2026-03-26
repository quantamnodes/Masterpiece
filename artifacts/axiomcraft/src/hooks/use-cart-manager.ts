import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCartSession } from '../store/use-cart-session';
import { 
  useGetCart, 
  useAddToCart, 
  useUpdateCartItem, 
  useRemoveCartItem,
  useClearCart,
  getGetCartQueryKey,
} from '@workspace/api-client-react';

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

  const removeMutation = useRemoveCartItem({
    mutation: { onSuccess: invalidateCart }
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
    await removeMutation.mutateAsync({ itemId, params: { sessionId } });
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
