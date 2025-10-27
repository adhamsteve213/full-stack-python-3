import { createContext, useEffect, useState,  } from 'react';
import { useAuth } from './AuthContext';
export const CartContext = createContext({});

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const { token, getAuthHeaders } = useAuth();
  const fetchCart = () => {
    if (!token) return;
    // fetch cart items (cartitems endpoint returns user-scoped items)
    fetch('http://127.0.0.1:8000/cartitems/', {
      headers: getAuthHeaders(),
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(data => setCartItems(data))
      .catch(error => console.error('Error fetching cart:', error));
  };

  // fetchCart depends on token; re-run when token changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchCart();
  }, [token]);

  // ...


  const addToCart = (product, quantity = 1, category) => {
    if (!token) return;
    // POST to cartitems endpoint (backend expects product_id, category, quantity)
    fetch('http://127.0.0.1:8000/cartitems/', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ product_id: product.id, quantity, category }),
    })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return res.json();
    })
    .then(() => {
        fetchCart(); // Re-fetch the entire cart to ensure UI is in sync with backend
    })
    .catch(error => {
        console.error('Error adding to cart:', error);
        // Optional: Re-fetch to sync state if API call fails
        fetchCart();
    });
  };
  const increaseCartQuantity = (cartItemId) => {
    if (!token) return;
    const item = cartItems.find((item) => item.id === cartItemId);
    if (item) {
      const newQuantity = item.quantity + 1;

      // Update the cart item on cartitems endpoint
      fetch(`http://127.0.0.1:8000/cartitems/${cartItemId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity: newQuantity }),
      })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(() => {
        fetchCart(); // Re-fetch cart
      })
      .catch(error => {
          console.error('Error increasing quantity:', error);
          fetchCart(); // Re-sync on error
      });
    }
  };

  const decreaseCartQuantity = (cartItemId) => {
    if (!token) return;
    const item = cartItems.find((item) => item.id === cartItemId);
    if (!item) return;

    if (item.quantity > 1) {
      const newQuantity = item.quantity - 1;

      fetch(`http://127.0.0.1:8000/cartitems/${cartItemId}/`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ quantity: newQuantity }),
      })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(() => {
        fetchCart(); // Re-fetch cart
      })
      .catch(error => {
          console.error('Error decreasing quantity:', error);
          fetchCart(); // Re-sync on error
      });
    } else {
      removeCompletelyFromCart(cartItemId);
    }
  };

  const removeCompletelyFromCart = (cartId) => {
    if (!token) return;
    // Delete the specific cart item
    fetch(`http://127.0.0.1:8000/cartitems/${cartId}/`, {
      method: 'DELETE',
      headers: getAuthHeaders({ json: false }),
    })
    .then(() => {
        fetchCart(); // Re-fetch cart
    })
    .catch(error => {
        console.error('Error removing from cart:', error);
        fetchCart(); // Re-sync on error
    });
  };

  const clearCart = () => {
    if (!token) return;
    // Optimistically update UI
    // The backend clears the cart items when an order is placed.
    // We just need to clear the local state.
    setCartItems([]);
  };

  const contextValue = {
    cartItems,
    addToCart,
    increaseCartQuantity,
    decreaseCartQuantity,
    removeCompletelyFromCart,
    clearCart,
  };

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;