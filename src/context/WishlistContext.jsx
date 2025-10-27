import { createContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';

export const WishlistContext = createContext({});

export const WishlistProvider = ({ children }) => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const { token, getAuthHeaders } = useAuth();

  const fetchWishlist = useCallback(() => {
    if (!token) return;
    return fetch('http://127.0.0.1:8000/wishlistItems/', {
      headers: getAuthHeaders(),
    })
      .then(async res => {
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}: ${res.statusText} ${text}`);
        }
        return res.json();
      })
      .then(data => {
        setWishlistItems(data);
        return data;
      })
      .catch(error => {
        console.error('Error fetching wishlist:', error);
        // clear list on auth error to avoid stale UI
        if (error.message && error.message.includes('403')) setWishlistItems([]);
        throw error;
      });
  }, [token, getAuthHeaders]);

  // fetchWishlist is stable in this file; re-run when token changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchWishlist();
  }, [token]);

  const addToWishlist = (product, category) => {
    if (!token) return Promise.reject(new Error('Not authenticated'));
    // optimistic UI: add a temporary placeholder to show immediate feedback
    const placeholder = { id: `temp-${Date.now()}`, product: { id: product.id, name: product.name }, pending: true };
    setWishlistItems(prev => [...prev, placeholder]);

    return fetch('http://127.0.0.1:8000/wishlistItems/', {
      method: 'POST',
      headers: getAuthHeaders(),
      // backend expects key 'product' (see wishlistItemsViewSet.create)
      body: JSON.stringify({ product: product.id, category }),
    })
    .then(async res => {
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${res.statusText} ${text}`);
      }
      return res.json();
    })
    .then(newItem => {
      // replace placeholder with real item
      setWishlistItems(prevItems => {
        return prevItems.map(it => it.id === placeholder.id ? newItem : it);
      });
      return newItem;
    })
    .catch(error => {
      console.error('Error adding to wishlist:', error);
      // remove placeholder
      setWishlistItems(prev => prev.filter(it => it.id !== placeholder.id));
      // try re-sync
      fetchWishlist().catch(() => {});
      throw error;
    });
  };

  const removeFromWishlist = (wishlistId) => {
    if (!token) return Promise.reject(new Error('Not authenticated'));
    // optimistic removal
    const prev = wishlistItems;
    setWishlistItems(prev.filter(item => item.id !== wishlistId));

    return fetch(`http://127.0.0.1:8000/wishlistItems/${wishlistId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders({ json: false }),
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.text().catch(() => '');
    })
    .catch(error => {
      console.error('Error removing from wishlist:', error);
      // rollback
      setWishlistItems(prev);
      fetchWishlist().catch(() => {});
      throw error;
    });
  };

  const isInWishlist = (productId) => {
    return wishlistItems.some(item => item.product?.id === productId);
  };

  const toggleWishlist = (product, category) => {
    const existingItem = wishlistItems.find(item => item.product?.id === product.id);
    if (existingItem) {
      return removeFromWishlist(existingItem.id);
    } else {
      return addToWishlist(product, category);
    }
  };

  const contextValue = {
    wishlistItems,
    addToWishlist,
    removeFromWishlist,
    isInWishlist,
    toggleWishlist,
  };

  return (
    <WishlistContext.Provider value={contextValue}>
      {children}
    </WishlistContext.Provider>
  );
};

export default WishlistProvider;