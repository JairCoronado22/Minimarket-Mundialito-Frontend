import React, { useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const products = [
  { id: 1, name: 'Arroz 5kg', category: 'Abarrotes', price: 18.5, stock: 12 },
  { id: 2, name: 'Gaseosa 2L', category: 'Bebidas', price: 9.8, stock: 18 },
  { id: 3, name: 'Leche 1L', category: 'Lácteos', price: 7.2, stock: 14 },
  { id: 4, name: 'Detergente', category: 'Limpieza', price: 13.5, stock: 9 },
  { id: 5, name: 'Fideos 1kg', category: 'Abarrotes', price: 6.9, stock: 22 },
  { id: 6, name: 'Agua 1.5L', category: 'Bebidas', price: 5.4, stock: 26 },
  { id: 7, name: 'Yogur natural', category: 'Lácteos', price: 4.4, stock: 11 },
  { id: 8, name: 'Cloro 1L', category: 'Limpieza', price: 11.2, stock: 8 },
];

const formatCurrency = (value) => `S/ ${Number(value || 0).toFixed(2)}`;

export default function App() {
  const [screen, setScreen] = useState('login');
  const [selectedRole, setSelectedRole] = useState('cashier');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [cart, setCart] = useState([]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = category === 'Todos' || product.category === category;
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || product.name.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navigateToRole = () => {
    setScreen(selectedRole === 'admin' ? 'dashboard' : 'pos');
  };

  const addToCart = (product) => {
    setCart((currentCart) => {
      const itemIndex = currentCart.findIndex((item) => item.id === product.id);

      if (itemIndex >= 0) {
        const updated = [...currentCart];
        updated[itemIndex].quantity += 1;
        return updated;
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const clearCart = () => setCart([]);

  const handleCheckout = () => {
    if (!cart.length) return;
    setCart([]);
    setScreen('dashboard');
  };

  const logout = () => {
    setScreen('login');
    setUsername('');
    setPassword('');
    setCart([]);
  };

  const renderLoginScreen = () => (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.loginContainer}>
        <View style={styles.card}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <MaterialIcons name="store" size={26} color="#fff" />
            </View>
            <View>
              <Text style={styles.brandName}>El Mundialito</Text>
              <Text style={styles.brandSub}>Minimarket & POS</Text>
            </View>
          </View>

          <Text style={styles.title}>Sistema de gestión</Text>
          <Text style={styles.subtitle}>Ingresa con tu rol</Text>

          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[styles.roleButton, selectedRole === 'cashier' ? styles.roleButtonActive : null]}
              onPress={() => setSelectedRole('cashier')}
            >
              <Text style={[styles.roleText, selectedRole === 'cashier' ? styles.roleTextActive : null]}>
                Cajero
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, selectedRole === 'admin' ? styles.roleButtonActive : null]}
              onPress={() => setSelectedRole('admin')}
            >
              <Text style={[styles.roleText, selectedRole === 'admin' ? styles.roleTextActive : null]}>
                Administrador
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Usuario o DNI</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="person" size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                placeholder="Ej. 12345678"
                placeholderTextColor="#98A2B3"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="lock" size={18} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#98A2B3"
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={navigateToRole}>
            <Text style={styles.primaryButtonText}>Ingresar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  const renderDashboardScreen = () => (
    <SafeAreaView style={styles.safeAreaDark}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.dashboardContent}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.smallLabel}>Retail Pulse</Text>
            <Text style={styles.screenTitle}>Dashboard</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={18} color="#fff" />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryGrid}>
          {[
            { label: 'Ventas hoy', value: 'S/ 7,920.50', icon: 'payments' },
            { label: 'Ticket promedio', value: 'S/ 188.20', icon: 'shopping_cart' },
            { label: 'Reabastecimientos', value: '24 sugeridos', icon: 'inventory_2' },
            { label: 'Inventario', value: '94.3%', icon: 'warehouse' },
          ].map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <MaterialIcons name={item.icon} size={20} color="#A855F7" />
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={() => setScreen('pos')}>
            <MaterialIcons name="point_of_sale" size={28} color="#0F172A" />
            <Text style={styles.actionTitle}>Punto de venta</Text>
            <Text style={styles.actionText}>Cobro rápido y carrito inteligente</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => setScreen('inventory')}>
            <MaterialIcons name="inventory" size={28} color="#0F172A" />
            <Text style={styles.actionTitle}>Reposición</Text>
            <Text style={styles.actionText}>Sugerencias de compra y stock</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Sugerencias de compra</Text>
          {[
            'Leche 1L · Stock crítico: 11 unidades',
            'Arroz 5kg · Pedido recomendado: 18 bolsas',
            'Agua mineral · Demanda alta por fin de semana',
          ].map((item) => (
            <View key={item} style={styles.listRow}>
              <View style={styles.dot} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const renderInventoryScreen = () => (
    <SafeAreaView style={styles.safeAreaDark}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.contentPad}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.smallLabel}>Compras</Text>
            <Text style={styles.screenTitle}>Reposición</Text>
          </View>
          <TouchableOpacity onPress={() => setScreen('dashboard')} style={styles.backButton}>
            <MaterialIcons name="arrow_back" size={18} color="#fff" />
            <Text style={styles.logoutText}>Volver</Text>
          </TouchableOpacity>
        </View>

        {products.map((product) => (
          <View key={product.id} style={styles.inventoryItem}>
            <View>
              <Text style={styles.inventoryName}>{product.name}</Text>
              <Text style={styles.inventoryMeta}>{product.category}</Text>
            </View>
            <View style={styles.inventoryRight}>
              <Text style={styles.inventoryStock}>Stock: {product.stock}</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => addToCart(product)}>
                <MaterialIcons name="add_shopping_cart" size={18} color="#fff" />
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );

  const renderPosScreen = () => (
    <SafeAreaView style={styles.safeAreaDark}>
      <StatusBar style="light" />
      <View style={styles.posContainer}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.smallLabel}>Terminal</Text>
            <Text style={styles.screenTitle}>Punto de venta</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <MaterialIcons name="logout" size={18} color="#fff" />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.posBody}>
          <View style={styles.productSection}>
            <TextInput
              placeholder="Buscar producto..."
              placeholderTextColor="#9AA5B1"
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />

            <View style={styles.filterRow}>
              {['Todos', 'Abarrotes', 'Bebidas', 'Lácteos', 'Limpieza'].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.filterChip, category === option ? styles.filterChipActive : null]}
                  onPress={() => setCategory(option)}
                >
                  <Text style={[styles.filterText, category === option ? styles.filterTextActive : null]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.productsGrid}>
              {filteredProducts.map((product) => (
                <View key={product.id} style={styles.productCard}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productCategory}>{product.category}</Text>
                  <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                  <TouchableOpacity style={styles.productButton} onPress={() => addToCart(product)}>
                    <Text style={styles.productButtonText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.cartSection}>
            <Text style={styles.cartTitle}>Venta actual</Text>
            <Text style={styles.cartMeta}>Caja 01 · {totalItems} artículos</Text>

            {cart.length === 0 ? (
              <Text style={styles.emptyCart}>Agrega productos para iniciar la venta.</Text>
            ) : (
              cart.map((item) => (
                <View key={item.id} style={styles.cartItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cartName}>{item.name}</Text>
                    <Text style={styles.cartPrice}>{formatCurrency(item.price)}</Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyButton}>
                      <MaterialIcons name="remove" size={16} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyButton}>
                      <MaterialIcons name="add" size={16} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <View style={styles.totalBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabelStrong}>Total</Text>
                <Text style={styles.totalStrong}>{formatCurrency(subtotal)}</Text>
              </View>
            </View>

            <TouchableOpacity style={[styles.checkoutButton, cart.length === 0 ? styles.checkoutDisabled : null]} onPress={handleCheckout} disabled={cart.length === 0}>
              <MaterialIcons name="payments" size={18} color="#fff" />
              <Text style={styles.checkoutText}>Cobrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );

  if (screen === 'login') return renderLoginScreen();
  if (screen === 'dashboard') return renderDashboardScreen();
  if (screen === 'inventory') return renderInventoryScreen();
  return renderPosScreen();
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FA' },
  safeAreaDark: { flex: 1, backgroundColor: '#0F172A' },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEF4FF',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  brandIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  brandName: { fontSize: 22, fontWeight: '800', color: '#1D4ED8' },
  brandSub: { fontSize: 12, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#475569', marginBottom: 18 },
  roleSelector: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 12, padding: 4, marginBottom: 18 },
  roleButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  roleButtonActive: { backgroundColor: '#1D4ED8' },
  roleText: { fontSize: 14, fontWeight: '700', color: '#334155' },
  roleTextActive: { color: '#fff' },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, color: '#0F172A', fontSize: 15 },
  primaryButton: {
    marginTop: 20,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dashboardContent: { padding: 20, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  smallLabel: { color: '#A78BFA', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '700' },
  screenTitle: { color: '#fff', fontSize: 28, fontWeight: '800' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logoutText: { color: '#fff', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  summaryCard: {
    width: '48%',
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  summaryLabel: { color: '#94A3B8', fontSize: 12, marginTop: 8 },
  summaryValue: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 8 },
  quickActions: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  actionCard: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    borderRadius: 18,
    padding: 18,
    marginRight: 10,
    alignItems: 'flex-start',
  },
  actionTitle: { color: '#0F172A', fontSize: 20, fontWeight: '800', marginTop: 12 },
  actionText: { color: '#475569', fontSize: 13, marginTop: 6 },
  panel: {
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  panelTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A78BFA', marginRight: 10 },
  listText: { flex: 1, color: '#E2E8F0', fontSize: 14 },
  contentPad: { padding: 20, paddingBottom: 40 },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inventoryItem: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inventoryName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  inventoryMeta: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  inventoryRight: { alignItems: 'flex-end' },
  inventoryStock: { color: '#E2E8F0', fontSize: 12 },
  addButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addButtonText: { color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 6 },
  posContainer: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  posBody: { flex: 1, flexDirection: 'row', marginTop: 14 },
  productSection: { flex: 2, marginRight: 12 },
  searchInput: {
    backgroundColor: '#111827',
    color: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 16,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  filterChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipActive: { backgroundColor: '#3B82F6' },
  filterText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: {
    width: '48%',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  productName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  productCategory: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  productPrice: { color: '#A78BFA', fontSize: 18, fontWeight: '800', marginTop: 10 },
  productButton: {
    marginTop: 12,
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  productButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cartSection: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  cartTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  cartMeta: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  emptyCart: { color: '#CBD5E1', fontSize: 14, marginTop: 18 },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  cartName: { color: '#fff', fontWeight: '700' },
  cartPrice: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E2E8F0', borderRadius: 10, padding: 4 },
  qtyButton: { padding: 4 },
  qtyText: { color: '#0F172A', fontSize: 14, fontWeight: '700', marginHorizontal: 10 },
  totalBox: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { color: '#CBD5E1', fontSize: 13 },
  totalValue: { color: '#fff', fontSize: 14 },
  totalLabelStrong: { color: '#fff', fontSize: 15, fontWeight: '700' },
  totalStrong: { color: '#A78BFA', fontSize: 20, fontWeight: '800' },
  checkoutButton: {
    marginTop: 18,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutDisabled: { opacity: 0.5 },
  checkoutText: { color: '#fff', fontSize: 14, fontWeight: '800', marginLeft: 8 },
});
