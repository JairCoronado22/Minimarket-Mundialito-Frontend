import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
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

const categories = ['Todos', 'Abarrotes', 'Bebidas', 'Lácteos', 'Limpieza'];
const paymentMethods = [
  { id: 'Efectivo', icon: 'payments' },
  { id: 'Tarjeta', icon: 'credit-card' },
  { id: 'Yape', icon: 'qr-code-2' },
  { id: 'Plin', icon: 'qr-code-2' },
];
const formatCurrency = (value) => `S/ ${Number(value || 0).toFixed(2)}`;

function getPredictiveAlerts(inventory, receipts, today = new Date()) {
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const alerts = inventory
    .filter((product) => product.stock <= 10)
    .map((product) => ({
      id: `stock-${product.id}`,
      type: 'stock',
      severity: product.stock === 0 ? 'critical' : 'warning',
      productName: product.name,
      quantity: product.stock,
      message:
        product.stock === 0
          ? 'Producto agotado'
          : `Quedan ${product.stock} unidades; se recomienda reponer`,
    }));

  receipts.forEach((receipt) => {
    const remainingQuantity = receipt.remainingQuantity ?? receipt.quantity;
    if (remainingQuantity === 0) return;

    const [year, month, day] = receipt.expiresAt.split('-').map(Number);
    const expirationDate = new Date(year, month - 1, day);
    const daysLeft = Math.floor(
      (expirationDate.getTime() - localToday.getTime()) / 86400000,
    );
    if (daysLeft > 30) return;

    const product = inventory.find((item) => item.id === receipt.productId);
    alerts.push({
      id: `expiration-${receipt.id}`,
      type: 'expiration',
      severity: daysLeft < 0 || daysLeft <= 7 ? 'critical' : 'warning',
      productName: product?.name ?? receipt.productName ?? 'Producto',
      quantity: remainingQuantity,
      lot: receipt.lot,
      message:
        daysLeft < 0
          ? `Lote vencido hace ${Math.abs(daysLeft)} días`
          : daysLeft === 0
            ? 'El lote vence hoy'
            : `El lote vence en ${daysLeft} días`,
      expiresAt: receipt.expiresAt,
    });
  });

  return alerts.sort(
    (first, second) =>
      (first.severity === 'critical' ? 0 : 1) -
      (second.severity === 'critical' ? 0 : 1),
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const isWide = width >= 700;
  const [screen, setScreen] = useState('login');
  const [activeRole, setActiveRole] = useState('cashier');
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanSelectionId, setScanSelectionId] = useState(null);
  const [scanFeedback, setScanFeedback] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [scanAssignments, setScanAssignments] = useState({});
  const scanLock = useRef(false);
  const [category, setCategory] = useState('Todos');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [lastSale, setLastSale] = useState(null);
  const [sales, setSales] = useState([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [saleCount, setSaleCount] = useState(0);
  const [inventory, setInventory] = useState(products);
  const [restockIds, setRestockIds] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [receivingProductId, setReceivingProductId] = useState(null);
  const [receiptQuantity, setReceiptQuantity] = useState('24');
  const [receiptSupplier, setReceiptSupplier] = useState('');
  const [receiptLot, setReceiptLot] = useState('');
  const [receiptExpiration, setReceiptExpiration] = useState('');
  const [receiptFeedback, setReceiptFeedback] = useState(null);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inventory.filter((product) => {
      const matchesCategory = category === 'Todos' || product.category === category;
      const matchesSearch = !query || product.name.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, inventory, search]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockProducts = inventory.filter((product) => product.stock <= 10);
  const predictiveAlerts = getPredictiveAlerts(inventory, receipts);
  const expirationAlerts = predictiveAlerts.filter(
    (alert) => alert.type === 'expiration',
  );
  const bellAnimation = useRef(new Animated.Value(0)).current;
  const bellRotation = bellAnimation.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-18deg', '18deg'],
  });
  const primaryInventoryAlert = predictiveAlerts[0];
  const scanProduct =
    inventory.find((product) => product.id === scanSelectionId) ??
    inventory.find((product) => product.stock > 0);
  const scanProductQuantity =
    cart.find((item) => item.id === scanProduct?.id)?.quantity ?? 0;
  const canScanProduct =
    scanProduct !== undefined && scanProductQuantity < scanProduct.stock;

  useEffect(() => {
    if (predictiveAlerts.length === 0) {
      bellAnimation.setValue(0);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(bellAnimation, {
          toValue: 1,
          duration: 90,
          useNativeDriver: false,
        }),
        Animated.timing(bellAnimation, {
          toValue: -1,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(bellAnimation, {
          toValue: 0.7,
          duration: 130,
          useNativeDriver: false,
        }),
        Animated.timing(bellAnimation, {
          toValue: -0.7,
          duration: 120,
          useNativeDriver: false,
        }),
        Animated.timing(bellAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [bellAnimation, predictiveAlerts.length]);

  const openCameraScanner = async () => {
    try {
      const permission = cameraPermission?.granted
        ? cameraPermission
        : await requestCameraPermission();
      if (!permission.granted) {
        setScannerActive(false);
        setScanFeedback('Se necesita permiso de cámara para escanear productos.');
        return;
      }

      scanLock.current = false;
      setScannedCode('');
      setScanFeedback('Enfoca el código de barras o QR del producto.');
      setScannerActive(true);
    } catch (error) {
      console.error('No se pudo solicitar acceso a la cámara:', error);
      setScannerActive(false);
      setScanFeedback('No se pudo abrir la cámara. Revisa los permisos del dispositivo.');
    }
  };

  const handleBarcodeScanned = ({ data }) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScannerActive(false);
    setScannedCode(data);

    const assignedProductId = scanAssignments[data];
    const assignedProduct = inventory.find(
      (product) => product.id === assignedProductId,
    );
    if (!assignedProduct) {
      setScanFeedback(`Código detectado: ${data}. Selecciona el producto para vincularlo.`);
      return;
    }

    const quantityInCart =
      cart.find((item) => item.id === assignedProduct.id)?.quantity ?? 0;
    if (quantityInCart >= assignedProduct.stock) {
      setScanFeedback(`Código reconocido, pero ${assignedProduct.name} ya no tiene stock disponible.`);
      return;
    }

    addToCart(assignedProduct);
    setScanFeedback(`${assignedProduct.name} reconocido y agregado a la venta.`);
  };

  const linkScannedCodeToProduct = () => {
    if (!scannedCode || !scanProduct || !canScanProduct) return;
    setScanAssignments((current) => ({
      ...current,
      [scannedCode]: scanProduct.id,
    }));
    addToCart(scanProduct);
    setScanFeedback(`Código vinculado a ${scanProduct.name} y agregado a la venta.`);
    setScannedCode('');
  };

  const enterAs = (role) => {
    setActiveRole(role);
    setScreen(role === 'admin' ? 'dashboard' : 'pos');
  };

  const addToCart = (product) => {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return currentCart;
        return currentCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      if (product.stock < 1) return currentCart;
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: Math.min(item.stock, Math.max(0, item.quantity + delta)) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const checkout = () => {
    if (cart.length === 0) return;
    const sale = {
      id: `V-${Date.now()}`,
      soldAt: new Date().toISOString(),
      cashier: 'Cajero de turno',
      terminal: 'Caja 01',
      paymentMethod,
      items: cart.map((item) => ({ ...item })),
      total: subtotal,
      itemCount: totalItems,
    };
    setLastSale(sale);
    setSales((currentSales) => [sale, ...currentSales]);
    setSalesTotal((total) => total + sale.total);
    setSaleCount((count) => count + 1);
    setInventory((currentInventory) =>
      currentInventory.map((product) => {
        const soldItem = sale.items.find((item) => item.id === product.id);
        return soldItem
          ? { ...product, stock: product.stock - soldItem.quantity }
          : product;
      }),
    );
    const updatedReceipts = receipts.map((receipt) => ({ ...receipt }));
    const quantitiesByProduct = new Map(
      sale.items.map((item) => [item.id, item.quantity]),
    );
    updatedReceipts
      .slice()
      .sort(
        (first, second) =>
          Date.parse(first.receivedAt) - Date.parse(second.receivedAt),
      )
      .forEach((receipt) => {
        let remainingToDeduct = quantitiesByProduct.get(receipt.productId) ?? 0;
        if (remainingToDeduct === 0) return;

        const receiptRemaining = receipt.remainingQuantity ?? receipt.quantity;
        const deducted = Math.min(receiptRemaining, remainingToDeduct);
        receipt.remainingQuantity = receiptRemaining - deducted;
        quantitiesByProduct.set(receipt.productId, remainingToDeduct - deducted);
      });
    setReceipts(updatedReceipts);
    setCart([]);
    setScannerActive(false);
    setScannerOpen(false);
    setScreen('receipt');
  };

  const logout = () => {
    setScreen('login');
    setCart([]);
    setRestockIds([]);
    setSearch('');
    setCategory('Todos');
    setLastSale(null);
    setScannerOpen(false);
    setScannerActive(false);
    setScanFeedback('');
    setScannedCode('');
  };

  const toggleRestock = (productId) => {
    setRestockIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const openReceiptForm = (productId) => {
    setReceivingProductId((currentId) =>
      currentId === productId ? null : productId,
    );
    setReceiptQuantity('24');
    setReceiptSupplier('');
    setReceiptLot('');
    setReceiptExpiration('');
    setReceiptFeedback(null);
  };

  const receiveStock = (product) => {
    const quantity = Number(receiptQuantity);
    const expirationDate = new Date(`${receiptExpiration}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setReceiptFeedback({ type: 'error', message: 'Ingresa una cantidad entera mayor que cero.' });
      return;
    }
    if (!receiptSupplier.trim() || !receiptLot.trim()) {
      setReceiptFeedback({ type: 'error', message: 'Completa el proveedor y el número de lote.' });
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(receiptExpiration) ||
      Number.isNaN(expirationDate.getTime()) ||
      expirationDate.toISOString().slice(0, 10) !== receiptExpiration ||
      expirationDate < today
    ) {
      setReceiptFeedback({ type: 'error', message: 'Ingresa una fecha de vencimiento válida que no haya pasado.' });
      return;
    }

    const receipt = {
      id: `R-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      supplier: receiptSupplier.trim(),
      quantity,
      remainingQuantity: quantity,
      lot: receiptLot.trim(),
      expiresAt: receiptExpiration,
      receivedAt: new Date().toISOString(),
    };
    setInventory((currentInventory) =>
      currentInventory.map((item) =>
        item.id === product.id
          ? { ...item, stock: item.stock + quantity }
          : item,
      ),
    );
    setReceipts((currentReceipts) => [receipt, ...currentReceipts]);
    setReceivingProductId(null);
    setReceiptFeedback({
      type: 'success',
      message: `Recepción confirmada: ${quantity} unidades de ${product.name}, lote ${receipt.lot}.`,
    });
  };

  const renderHeader = (eyebrow, title, onBack) => (
    <View>
      <View style={styles.topBar}>
        <View style={styles.headerTitleWrap}>
          {onBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={onBack}
              style={styles.iconButton}
            >
              <MaterialIcons name="arrow-back" size={22} color="#172B4D" />
            </TouchableOpacity>
          ) : null}
          <View style={styles.headerText}>
            <Text style={styles.smallLabel}>{eyebrow}</Text>
            <Text style={styles.screenTitle}>{title}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              predictiveAlerts.length > 0
                ? `${predictiveAlerts.length} alertas de inventario`
                : 'Sin alertas de inventario'
            }
            accessibilityState={{ expanded: alertsExpanded }}
            onPress={() => setAlertsExpanded((current) => !current)}
            disabled={predictiveAlerts.length === 0}
            style={[
              styles.notificationButton,
              predictiveAlerts.length > 0 && styles.notificationButtonActive,
              predictiveAlerts.length === 0 && styles.notificationButtonDisabled,
            ]}
          >
            <Animated.View style={{ transform: [{ rotate: bellRotation }] }}>
              <MaterialIcons
                name={predictiveAlerts.length > 0 ? 'notifications-active' : 'notifications-none'}
                size={22}
                color={predictiveAlerts.length > 0 ? '#B42318' : '#64748B'}
              />
            </Animated.View>
            {predictiveAlerts.length > 0 ? (
              <Text style={styles.notificationCount}>
                {predictiveAlerts.length > 99 ? '99+' : predictiveAlerts.length}
              </Text>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={logout}
            style={styles.logoutButton}
          >
            <MaterialIcons name="logout" size={18} color="#334155" />
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>
      {primaryInventoryAlert ? (
        <View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ expanded: alertsExpanded }}
            onPress={() => setAlertsExpanded((current) => !current)}
            style={[
              styles.inventoryAlertBanner,
              primaryInventoryAlert.severity === 'critical' &&
                styles.inventoryAlertBannerCritical,
            ]}
          >
            <MaterialIcons
              name={
                primaryInventoryAlert.type === 'expiration'
                  ? 'event-busy'
                  : 'inventory-2'
              }
              size={19}
              color={
                primaryInventoryAlert.severity === 'critical'
                  ? '#B42318'
                  : '#A84A20'
              }
            />
            <Text numberOfLines={2} style={styles.inventoryAlertBannerText}>
              {primaryInventoryAlert.type === 'expiration'
                ? `${primaryInventoryAlert.productName}: ${primaryInventoryAlert.message.toLowerCase()}`
                : `${primaryInventoryAlert.productName}: ${primaryInventoryAlert.message}`}
            </Text>
            <Text style={styles.inventoryAlertBannerCount}>
              {predictiveAlerts.length}
            </Text>
          </TouchableOpacity>
          {alertsExpanded ? (
            <View style={styles.headerAlertList}>
              {predictiveAlerts.map((alert) => (
                <View key={alert.id} style={styles.headerAlertEntry}>
                  <MaterialIcons
                    name={alert.type === 'expiration' ? 'event-busy' : 'inventory-2'}
                    size={18}
                    color={alert.severity === 'critical' ? '#B42318' : '#A84A20'}
                  />
                  <View style={styles.headerAlertCopy}>
                    <Text style={styles.headerAlertTitle}>{alert.productName}</Text>
                    <Text style={styles.headerAlertMessage}>
                      {alert.type === 'expiration'
                        ? `${alert.message} · Lote ${alert.lot} · ${alert.quantity} unidades`
                        : alert.message}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const renderLoginScreen = () => (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.loginContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.loginCard}>
          <View style={styles.brandRow}>
            <View style={styles.brandIcon}>
              <MaterialIcons name="store" size={26} color="#fff" />
            </View>
            <View>
              <Text style={styles.brandName}>El Mundialito</Text>
              <Text style={styles.brandSub}>Minimarket</Text>
            </View>
          </View>

          <Text style={styles.loginTitle}>Bienvenido</Text>
          <Text style={styles.loginSubtitle}>Elige cómo quieres ingresar.</Text>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => enterAs('cashier')}
            style={styles.roleCard}
          >
            <View style={[styles.roleIcon, styles.cashierIcon]}>
              <MaterialIcons name="point-of-sale" size={24} color="#087443" />
            </View>
            <View style={styles.roleCopy}>
              <Text style={styles.roleTitle}>Entrar como cajero</Text>
              <Text style={styles.roleDescription}>Buscar productos y registrar una venta</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => enterAs('admin')}
            style={styles.roleCard}
          >
            <View style={[styles.roleIcon, styles.adminIcon]}>
              <MaterialIcons name="space-dashboard" size={24} color="#3159B8" />
            </View>
            <View style={styles.roleCopy}>
              <Text style={styles.roleTitle}>Entrar como administrador</Text>
              <Text style={styles.roleDescription}>Ver el resumen y gestionar reposición</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#64748B" />
          </TouchableOpacity>

          <Text style={styles.demoNote}>
            Modo de demostración: la información se guarda solo durante esta sesión.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const renderDashboardScreen = () => {
    const paymentTotals = paymentMethods.map(({ id }) => {
      const methodSales = sales.filter((sale) => sale.paymentMethod === id);
      return {
        method: id,
        count: methodSales.length,
        total: methodSales.reduce((sum, sale) => sum + sale.total, 0),
      };
    });
    const stats = [
      {
        label: 'Ventas de esta sesión',
        value: formatCurrency(salesTotal),
        icon: 'payments',
        color: '#087443',
      },
      {
        label: 'Ventas registradas',
        value: String(saleCount),
        icon: 'receipt-long',
        color: '#3159B8',
      },
      {
        label: 'Productos por reponer',
        value: String(lowStockProducts.length),
        icon: 'inventory-2',
        color: '#C46A12',
      },
      {
        label: 'Productos en catálogo',
        value: String(inventory.length),
        icon: 'storefront',
        color: '#7650B5',
      },
    ];

    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.pageContent}>
          {renderHeader('El Mundialito', 'Resumen')}
          <Text style={styles.sectionHint}>Indicadores de esta sesión de demostración.</Text>

          <View style={styles.summaryGrid}>
            {stats.map((item) => (
              <View key={item.label} style={styles.summaryCard}>
                <View style={[styles.statIcon, { backgroundColor: `${item.color}15` }]}>
                  <MaterialIcons name={item.icon} size={21} color={item.color} />
                </View>
                <Text style={styles.summaryLabel}>{item.label}</Text>
                <Text style={styles.summaryValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>¿Qué quieres hacer?</Text>
          <View style={[styles.quickActions, isWide && styles.quickActionsWide]}>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.actionCard, isWide && styles.actionCardWide]}
              onPress={() => setScreen('pos')}
            >
              <View style={[styles.actionIcon, styles.cashierIcon]}>
                <MaterialIcons name="point-of-sale" size={25} color="#087443" />
              </View>
              <Text style={styles.actionTitle}>Nueva venta</Text>
              <Text style={styles.actionText}>Selecciona productos y registra el cobro.</Text>
              <Text style={styles.actionLink}>Ir al punto de venta  ›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.actionCard, isWide && styles.actionCardWide]}
              onPress={() => setScreen('inventory')}
            >
              <View style={[styles.actionIcon, styles.adminIcon]}>
                <MaterialIcons name="inventory-2" size={25} color="#3159B8" />
              </View>
              <Text style={styles.actionTitle}>Reposición</Text>
              <Text style={styles.actionText}>Revisa existencias y arma una lista de productos.</Text>
              <Text style={styles.actionLink}>Revisar inventario  ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <Text style={styles.sectionTitle}>Ventas de caja</Text>
              <Text style={styles.panelCount}>{sales.length}</Text>
            </View>
            {sales.length === 0 ? (
              <Text style={styles.mutedText}>
                Las ventas cobradas por el cajero aparecerán aquí con sus productos, hora e importe.
              </Text>
            ) : (
              sales.map((sale) => (
                <View key={sale.id} style={styles.saleEntry}>
                  <View style={styles.saleEntryHeading}>
                    <Text style={styles.saleEntryDate}>
                      {new Date(sale.soldAt).toLocaleString('es-PE')}
                    </Text>
                    <Text style={styles.saleEntryTotal}>{formatCurrency(sale.total)}</Text>
                  </View>
                  <Text style={styles.saleEntryMeta}>
                    {sale.cashier} · {sale.terminal} · {sale.paymentMethod}
                  </Text>
                  <Text style={styles.saleEntryItems}>
                    {sale.items.map((item) => `${item.name} × ${item.quantity}`).join(' · ')}
                  </Text>
                </View>
              ))
            )}
            <Text style={styles.paymentSummaryTitle}>Recaudación por medio de pago</Text>
            {paymentTotals.map((payment) => (
              <View key={payment.method} style={styles.paymentSummaryRow}>
                <Text style={styles.paymentSummaryMethod}>{payment.method}</Text>
                <Text style={styles.paymentSummaryCount}>
                  {payment.count} {payment.count === 1 ? 'venta' : 'ventas'}
                </Text>
                <Text style={styles.paymentSummaryTotal}>{formatCurrency(payment.total)}</Text>
              </View>
            ))}
            <Text style={styles.paymentSummaryNote}>Acumulado de las ventas registradas en esta sesión.</Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <Text style={styles.sectionTitle}>Alertas Predictivas</Text>
              <Text style={styles.panelCount}>{predictiveAlerts.length}</Text>
            </View>
            {predictiveAlerts.length === 0 ? (
              <Text style={styles.mutedText}>
                Sin alertas: no hay productos con stock bajo ni lotes próximos a vencer.
              </Text>
            ) : (
              predictiveAlerts.map((alert) => (
                <View key={alert.id} style={styles.alertEntry}>
                  <MaterialIcons
                    name={alert.type === 'expiration' ? 'event-busy' : 'inventory-2'}
                    size={19}
                    color={alert.severity === 'critical' ? '#B42318' : '#C46A12'}
                  />
                  <View style={styles.alertEntryCopy}>
                    <Text style={styles.alertEntryTitle}>{alert.productName}</Text>
                    <Text style={styles.alertEntryMessage}>{alert.message}</Text>
                    <Text style={styles.alertEntryMeta}>
                      {alert.type === 'expiration'
                        ? `Lote ${alert.lot} · ${alert.quantity} unidades · vence ${new Date(`${alert.expiresAt}T00:00:00`).toLocaleDateString('es-PE')}`
                        : `${alert.quantity} unidades disponibles`}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.alertSeverity,
                      alert.severity === 'critical'
                        ? styles.alertSeverityCritical
                        : styles.alertSeverityWarning,
                    ]}
                  >
                    {alert.severity === 'critical' ? 'Urgente' : 'Atención'}
                  </Text>
                </View>
              ))
            )}
            <Text style={styles.paymentSummaryNote}>
              Umbral de reposición: 10 unidades. Próximo a vencer: dentro de 30 días.
            </Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <Text style={styles.sectionTitle}>Stock bajo</Text>
              <Text style={styles.panelCount}>{lowStockProducts.length}</Text>
            </View>
            {lowStockProducts.length === 0 ? (
              <Text style={styles.mutedText}>No hay productos con stock bajo.</Text>
            ) : (
              lowStockProducts.map((product) => (
                <View key={product.id} style={styles.listRow}>
                  <View style={styles.warningDot} />
                  <Text style={styles.listText}>{product.name}</Text>
                  <Text style={styles.stockWarning}>{product.stock} unidades</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeading}>
              <Text style={styles.sectionTitle}>Productos por vencer</Text>
              <Text style={styles.panelCount}>{expirationAlerts.length}</Text>
            </View>
            {expirationAlerts.length === 0 ? (
              <Text style={styles.mutedText}>
                No hay lotes vencidos ni próximos a vencer dentro de 30 días.
              </Text>
            ) : (
              expirationAlerts.map((alert) => (
                <View key={alert.id} style={styles.alertEntry}>
                  <MaterialIcons
                    name="event-busy"
                    size={19}
                    color={alert.severity === 'critical' ? '#B42318' : '#C46A12'}
                  />
                  <View style={styles.alertEntryCopy}>
                    <Text style={styles.alertEntryTitle}>{alert.productName}</Text>
                    <Text style={styles.alertEntryMessage}>{alert.message}</Text>
                    <Text style={styles.alertEntryMeta}>
                      {`Lote ${alert.lot} · ${alert.quantity} unidades · vence ${new Date(`${alert.expiresAt}T00:00:00`).toLocaleDateString('es-PE')}`}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.alertSeverity,
                      alert.severity === 'critical'
                        ? styles.alertSeverityCritical
                        : styles.alertSeverityWarning,
                    ]}
                  >
                    {alert.severity === 'critical' ? 'Urgente' : 'Atención'}
                  </Text>
                </View>
              ))
            )}
            <Text style={styles.paymentSummaryNote}>
              Incluye lotes vencidos y los que vencen dentro de los próximos 30 días.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderInventoryScreen = () => (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.pageContent}>
        {renderHeader('Administración', 'Reposición', () => setScreen('dashboard'))}
        <Text style={styles.sectionHint}>
          Selecciona productos para reponer o registra lotes recibidos con su proveedor y vencimiento.
        </Text>

        {receiptFeedback ? (
          <Text
            accessibilityRole={receiptFeedback.type === 'error' ? 'alert' : 'text'}
            style={[
              styles.receiptFeedback,
              receiptFeedback.type === 'error'
                ? styles.receiptFeedbackError
                : styles.receiptFeedbackSuccess,
            ]}
          >
            {receiptFeedback.message}
          </Text>
        ) : null}

        <View style={styles.restockSummary}>
          <MaterialIcons name="checklist" size={22} color="#3159B8" />
          <Text style={styles.restockSummaryText}>
            {restockIds.length === 0
              ? 'Aún no seleccionaste productos'
              : `${restockIds.length} ${restockIds.length === 1 ? 'producto seleccionado' : 'productos seleccionados'}`}
          </Text>
          {restockIds.length > 0 ? (
            <TouchableOpacity onPress={() => setRestockIds([])}>
              <Text style={styles.clearSelection}>Limpiar</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {inventory.map((product) => {
          const selected = restockIds.includes(product.id);
          const lowStock = product.stock <= 10;
          return (
            <View key={product.id}>
              <View style={styles.inventoryItem}>
                <View style={styles.inventoryCopy}>
                  <Text style={styles.inventoryName}>{product.name}</Text>
                  <Text style={styles.inventoryMeta}>{product.category}</Text>
                </View>
                <View style={styles.inventoryRight}>
                  <View style={[styles.stockBadge, lowStock && styles.stockBadgeLow]}>
                    <Text style={[styles.stockBadgeText, lowStock && styles.stockBadgeTextLow]}>
                      {product.stock} en stock
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => toggleRestock(product.id)}
                    style={[styles.addButton, selected && styles.removeButton]}
                  >
                    <MaterialIcons
                      name={selected ? 'check' : 'add'}
                      size={17}
                      color={selected ? '#087443' : '#3159B8'}
                    />
                    <Text style={[styles.addButtonText, selected && styles.removeButtonText]}>
                      {selected ? 'Seleccionado' : 'Agregar a reposición'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => openReceiptForm(product.id)}
                    style={styles.receiveButton}
                  >
                    <MaterialIcons name="move-to-inbox" size={17} color="#087443" />
                    <Text style={styles.receiveButtonText}>
                      {receivingProductId === product.id ? 'Cerrar ingreso' : 'Registrar ingreso'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {receivingProductId === product.id ? (
                <View style={styles.receiptForm}>
                  <Text style={styles.receiptFormTitle}>Recibir lote de {product.name}</Text>
                  <Text style={styles.receiptFormHint}>
                    Completa cantidad, proveedor, lote y fecha de vencimiento antes de confirmar.
                  </Text>
                  <View style={styles.receiptFields}>
                    <TextInput
                      accessibilityLabel="Cantidad recibida"
                      keyboardType="number-pad"
                      onChangeText={setReceiptQuantity}
                      placeholder="Cantidad (por ejemplo, 24)"
                      value={receiptQuantity}
                      style={styles.receiptInput}
                    />
                    <TextInput
                      accessibilityLabel="Proveedor"
                      onChangeText={setReceiptSupplier}
                      placeholder="Proveedor"
                      value={receiptSupplier}
                      style={styles.receiptInput}
                    />
                    <TextInput
                      accessibilityLabel="Número de lote"
                      onChangeText={setReceiptLot}
                      placeholder="Número de lote"
                      value={receiptLot}
                      style={styles.receiptInput}
                    />
                    <TextInput
                      accessibilityLabel="Fecha de vencimiento"
                      onChangeText={setReceiptExpiration}
                      placeholder="Vencimiento (AAAA-MM-DD)"
                      value={receiptExpiration}
                      style={styles.receiptInput}
                    />
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => receiveStock(product)}
                    style={styles.confirmReceiptButton}
                  >
                    <MaterialIcons name="check" size={18} color="#fff" />
                    <Text style={styles.confirmReceiptText}>Confirmar recepción</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })}
        <View style={styles.panel}>
          <View style={styles.panelHeading}>
            <Text style={styles.sectionTitle}>Lotes recibidos</Text>
            <Text style={styles.panelCount}>{receipts.length}</Text>
          </View>
          {receipts.length === 0 ? (
            <Text style={styles.mutedText}>
              Los lotes confirmados aparecerán aquí con cantidad, proveedor y vencimiento.
            </Text>
          ) : (
            receipts.map((receipt) => (
              <View key={receipt.id} style={styles.receiptEntry}>
                <Text style={styles.inventoryName}>{receipt.productName} · {receipt.quantity} unidades</Text>
                <Text style={styles.inventoryMeta}>
                  Proveedor: {receipt.supplier} · Lote: {receipt.lot}
                </Text>
                <Text style={styles.inventoryMeta}>
                  Vence: {new Date(`${receipt.expiresAt}T00:00:00`).toLocaleDateString('es-PE')}
                </Text>
              </View>
            ))
          )}
        </View>
        <Text style={styles.demoNote}>
          La recepción actualiza el stock de esta sesión. La compra y el lote son una simulación.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );

  const renderPosScreen = () => (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.pageContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderHeader(
          'Caja 01',
          'Punto de venta',
          activeRole === 'admin'
            ? () => {
                setScannerActive(false);
                setScreen('dashboard');
              }
            : null,
        )}

        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={21} color="#64748B" />
          <TextInput
            accessibilityLabel="Buscar productos"
            placeholder="Busca por nombre..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
              onPress={() => setSearch('')}
            >
              <MaterialIcons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ expanded: scannerOpen }}
          onPress={() => {
            if (!scannerOpen) {
              setScanSelectionId((current) =>
                current ?? inventory.find((product) => product.stock > 0)?.id ?? null,
              );
            } else {
              setScannerActive(false);
            }
            setScannerOpen((current) => !current);
            setScanFeedback('');
          }}
          style={styles.scanToggle}
        >
          <MaterialIcons name="qr-code-scanner" size={20} color="#176B4D" />
          <Text style={styles.scanToggleText}>
            {scannerOpen ? 'Cerrar escáner de productos' : 'Escanear producto'}
          </Text>
          <MaterialIcons
            name={scannerOpen ? 'expand-less' : 'expand-more'}
            size={20}
            color="#176B4D"
          />
        </TouchableOpacity>
        {scannerOpen ? (
          <View style={styles.scannerPanel}>
            <Text style={styles.scannerTitle}>Escaneo de productos</Text>
            <Text style={styles.scannerHint}>
              Usa la cámara del celular para leer un código de barras o QR. También puedes simular la lectura manualmente.
            </Text>
            {scannerActive ? (
              <View style={styles.cameraPreview}>
                <CameraView
                  accessibilityLabel="Cámara para escanear productos"
                  barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'],
                  }}
                  facing="back"
                  onBarcodeScanned={handleBarcodeScanned}
                  onMountError={({ message }) => {
                    console.error('No se pudo iniciar la cámara:', message);
                    setScannerActive(false);
                    setScanFeedback('No se pudo iniciar la cámara. Comprueba los permisos e inténtalo de nuevo.');
                  }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View pointerEvents="none" style={styles.cameraFrame} />
              </View>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={openCameraScanner}
                style={styles.cameraButton}
              >
                <MaterialIcons name="photo-camera" size={19} color="#fff" />
                <Text style={styles.scanActionText}>
                  {cameraPermission?.granted ? 'Abrir cámara' : 'Dar permiso y abrir cámara'}
                </Text>
              </TouchableOpacity>
            )}
            {scannedCode ? (
              <View style={styles.scannedCodePanel}>
                <Text style={styles.scannedCodeLabel}>Código detectado</Text>
                <Text selectable style={styles.scannedCodeValue}>{scannedCode}</Text>
                {!scanAssignments[scannedCode] ? (
                  <>
                    <Text style={styles.scannerHint}>
                      Primera lectura de este código: elige a qué producto corresponde para agregarlo.
                    </Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={!canScanProduct}
                      onPress={linkScannedCodeToProduct}
                      style={[styles.scanAction, !canScanProduct && styles.disabledButton]}
                    >
                      <MaterialIcons name="link" size={19} color="#fff" />
                      <Text style={styles.scanActionText}>Vincular código y agregar</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            ) : null}
            {scanFeedback ? (
              <Text accessibilityLiveRegion="polite" style={styles.scanFeedback}>
                {scanFeedback}
              </Text>
            ) : null}
            {!scannerActive && scannedCode ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={openCameraScanner}
                style={styles.scanAgainButton}
              >
                <MaterialIcons name="refresh" size={17} color="#176B4D" />
                <Text style={styles.scanAgainText}>Escanear otro producto</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={styles.simulatorLabel}>O simula el escaneo seleccionando un producto:</Text>
            <View style={styles.scannerChoices}>
              {inventory.map((product) => {
                const selected = scanProduct?.id === product.id;
                const quantityInCart =
                  cart.find((item) => item.id === product.id)?.quantity ?? 0;
                const isUnavailable = quantityInCart >= product.stock;
                return (
                  <TouchableOpacity
                    key={product.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: isUnavailable }}
                    disabled={isUnavailable}
                    onPress={() => {
                      setScanSelectionId(product.id);
                      setScanFeedback('');
                    }}
                    style={[
                      styles.scannerChoice,
                      selected && styles.scannerChoiceSelected,
                      isUnavailable && styles.disabledButton,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.scannerChoiceText,
                        selected && styles.scannerChoiceTextSelected,
                      ]}
                    >
                      {product.name}
                    </Text>
                    <Text
                      style={[
                        styles.scannerChoiceStock,
                        selected && styles.scannerChoiceTextSelected,
                      ]}
                    >
                      {Math.max(0, product.stock - quantityInCart)} disponibles
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={!canScanProduct}
              onPress={() => {
                if (!scanProduct || !canScanProduct) return;
                addToCart(scanProduct);
                setScanFeedback(`${scanProduct.name} escaneado y agregado a la venta.`);
              }}
              style={[styles.scanAction, !canScanProduct && styles.disabledButton]}
            >
              <MaterialIcons name="qr-code-scanner" size={19} color="#fff" />
              <Text style={styles.scanActionText}>Simular lectura y agregar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {categories.map((option) => (
            <TouchableOpacity
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: category === option }}
              style={[styles.filterChip, category === option && styles.filterChipActive]}
              onPress={() => setCategory(option)}
            >
              <Text style={[styles.filterText, category === option && styles.filterTextActive]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Productos</Text>
          <Text style={styles.resultCount}>{filteredProducts.length} disponibles</Text>
        </View>
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={30} color="#94A3B8" />
            <Text style={styles.emptyStateTitle}>No encontramos productos</Text>
            <Text style={styles.mutedText}>Prueba otra búsqueda o categoría.</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => {
              const quantityInCart = cart.find((item) => item.id === product.id)?.quantity || 0;
              const outOfStock = quantityInCart >= product.stock;
              return (
                <View
                  key={product.id}
                  style={[
                    styles.productCard,
                    { width: isWide ? '31.5%' : '48.5%' },
                  ]}
                >
                  <Text style={styles.productCategory}>{product.category}</Text>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productStock}>
                    {outOfStock ? 'Stock agregado al carrito' : `${product.stock - quantityInCart} en stock`}
                  </Text>
                  <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={outOfStock}
                    onPress={() => addToCart(product)}
                    style={[styles.productButton, outOfStock && styles.disabledButton]}
                  >
                    <MaterialIcons name="add" size={18} color="#fff" />
                    <Text style={styles.productButtonText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.cartSection}>
          <View style={styles.cartHeading}>
            <View>
              <Text style={styles.sectionTitle}>Venta actual</Text>
              <Text style={styles.cartMeta}>
                {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
              </Text>
            </View>
            {cart.length > 0 ? (
              <TouchableOpacity onPress={() => setCart([])}>
                <Text style={styles.clearSelection}>Vaciar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <MaterialIcons name="shopping-cart" size={25} color="#94A3B8" />
              <Text style={styles.emptyCartText}>Agrega productos para iniciar la venta.</Text>
            </View>
          ) : (
            cart.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                <View style={styles.cartItemCopy}>
                  <Text style={styles.cartName}>{item.name}</Text>
                  <Text style={styles.cartPrice}>{formatCurrency(item.price)} c/u</Text>
                </View>
                <View style={styles.qtyBox}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar una unidad de ${item.name}`}
                    onPress={() => updateQuantity(item.id, -1)}
                    style={styles.qtyButton}
                  >
                    <MaterialIcons name="remove" size={18} color="#172B4D" />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Agregar una unidad de ${item.name}`}
                    disabled={item.quantity >= item.stock}
                    onPress={() => updateQuantity(item.id, 1)}
                    style={styles.qtyButton}
                  >
                    <MaterialIcons name="add" size={18} color="#172B4D" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.lineTotal}>{formatCurrency(item.price * item.quantity)}</Text>
              </View>
            ))
          )}

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Total a cobrar</Text>
            <Text style={styles.totalStrong}>{formatCurrency(subtotal)}</Text>
          </View>
          <Text style={styles.paymentLabel}>Medio de pago · simulación</Text>
          <View style={styles.paymentOptions}>
            {paymentMethods.map(({ id, icon }) => {
              const selected = paymentMethod === id;
              return (
                <TouchableOpacity
                  key={id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setPaymentMethod(id)}
                  style={[styles.paymentOption, selected && styles.paymentOptionActive]}
                >
                  <MaterialIcons
                    name={icon}
                    size={18}
                    color={selected ? '#fff' : '#475569'}
                  />
                  <Text style={[styles.paymentOptionText, selected && styles.paymentOptionTextActive]}>
                    {id}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={cart.length === 0}
            onPress={checkout}
            style={[styles.checkoutButton, cart.length === 0 && styles.disabledButton]}
          >
            <MaterialIcons name="payments" size={20} color="#fff" />
            <Text style={styles.checkoutText}>Registrar venta</Text>
          </TouchableOpacity>
          <Text style={styles.checkoutNote}>Pago simulado. La venta y su medio de pago aparecen en el resumen del administrador.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const renderReceiptScreen = () => (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.receiptPage}>
        <View style={styles.receiptCard}>
          <View style={styles.receiptSuccess}>
            <MaterialIcons name="check" size={34} color="#087443" />
          </View>
          <Text style={styles.receiptTitle}>Venta registrada</Text>
          <Text style={styles.receiptSubtitle}>
            Pago simulado con {lastSale?.paymentMethod}. El registro es válido durante esta sesión.
          </Text>

          <View style={styles.receiptTotal}>
            <Text style={styles.receiptTotalLabel}>Total</Text>
            <Text style={styles.receiptTotalValue}>{formatCurrency(lastSale?.total)}</Text>
          </View>

          <Text style={styles.sectionTitle}>Detalle</Text>
          {lastSale?.items.map((item) => (
            <View key={item.id} style={styles.receiptRow}>
              <View style={styles.receiptItemCopy}>
                <Text style={styles.cartName}>{item.name}</Text>
                <Text style={styles.cartPrice}>
                  {item.quantity} × {formatCurrency(item.price)}
                </Text>
              </View>
              <Text style={styles.lineTotal}>{formatCurrency(item.price * item.quantity)}</Text>
            </View>
          ))}

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setScreen(activeRole === 'admin' ? 'dashboard' : 'pos')}
            style={styles.checkoutButton}
          >
            <MaterialIcons
              name={activeRole === 'admin' ? 'dashboard' : 'add'}
              size={20}
              color="#fff"
            />
            <Text style={styles.checkoutText}>
              {activeRole === 'admin' ? 'Volver al resumen' : 'Iniciar nueva venta'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  if (screen === 'login') return renderLoginScreen();
  if (screen === 'dashboard') return renderDashboardScreen();
  if (screen === 'inventory') return renderInventoryScreen();
  if (screen === 'receipt') return renderReceiptScreen();
  return renderPosScreen();
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7FB' },
  loginContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5EAF2',
    shadowColor: '#172B4D',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#176B4D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  brandName: { fontSize: 20, fontWeight: '800', color: '#172B4D' },
  brandSub: { fontSize: 12, color: '#64748B', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  loginTitle: { fontSize: 29, fontWeight: '800', color: '#172B4D' },
  loginSubtitle: { fontSize: 15, color: '#64748B', marginTop: 6, marginBottom: 22 },
  roleCard: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5EAF2',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  roleIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cashierIcon: { backgroundColor: '#E7F5ED' },
  adminIcon: { backgroundColor: '#ECF1FF' },
  roleCopy: { flex: 1, marginHorizontal: 12 },
  roleTitle: { color: '#172B4D', fontSize: 15, fontWeight: '700' },
  roleDescription: { color: '#64748B', fontSize: 12, marginTop: 4, lineHeight: 17 },
  demoNote: { color: '#718096', fontSize: 12, lineHeight: 18, marginTop: 14 },
  pageContent: { padding: 18, paddingBottom: 36, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  topBar: { minHeight: 58, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  headerText: { flexShrink: 1 },
  smallLabel: { color: '#64748B', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700', marginBottom: 3 },
  screenTitle: { color: '#172B4D', fontSize: 24, lineHeight: 30, fontWeight: '800' },
  iconButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 1, borderColor: '#E5EAF2' },
  notificationButton: { minWidth: 40, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 12, marginRight: 8, paddingHorizontal: 7 },
  notificationButtonActive: { borderColor: '#F3B7B3', backgroundColor: '#FFF7F6' },
  notificationButtonDisabled: { opacity: 0.65 },
  notificationCount: { color: '#fff', backgroundColor: '#B42318', overflow: 'hidden', borderRadius: 8, minWidth: 17, textAlign: 'center', paddingHorizontal: 4, fontSize: 10, lineHeight: 16, fontWeight: '800', marginLeft: 3 },
  logoutButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  logoutText: { color: '#334155', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  inventoryAlertBanner: { minHeight: 42, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1E8', borderWidth: 1, borderColor: '#F5D0B5', borderRadius: 11, paddingHorizontal: 11, paddingVertical: 7, marginTop: -10, marginBottom: 12 },
  inventoryAlertBannerCritical: { backgroundColor: '#FEE4E2', borderColor: '#FDA29B' },
  inventoryAlertBannerText: { flex: 1, color: '#7A2E0E', fontSize: 12, lineHeight: 17, fontWeight: '700', marginHorizontal: 8 },
  inventoryAlertBannerCount: { color: '#7A2E0E', fontSize: 11, fontWeight: '800' },
  headerAlertList: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 12, paddingHorizontal: 11, marginTop: -5, marginBottom: 12 },
  headerAlertEntry: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F3F7', paddingVertical: 9 },
  headerAlertCopy: { flex: 1, marginLeft: 9 },
  headerAlertTitle: { color: '#172B4D', fontSize: 12, fontWeight: '800' },
  headerAlertMessage: { color: '#64748B', fontSize: 11, lineHeight: 16, marginTop: 2 },
  sectionHint: { color: '#64748B', fontSize: 13, lineHeight: 19, marginTop: -10, marginBottom: 18 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  summaryCard: { width: '48.5%', minHeight: 138, backgroundColor: '#fff', borderRadius: 17, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E5EAF2' },
  statIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  summaryLabel: { color: '#64748B', fontSize: 12, lineHeight: 17, marginTop: 11 },
  summaryValue: { color: '#172B4D', fontSize: 18, fontWeight: '800', marginTop: 4 },
  sectionTitle: { color: '#172B4D', fontSize: 18, fontWeight: '800' },
  quickActions: { marginTop: 12 },
  quickActionsWide: { flexDirection: 'row', gap: 14 },
  actionCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 17, padding: 17, marginBottom: 12 },
  actionCardWide: { flex: 1 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  actionTitle: { color: '#172B4D', fontSize: 17, fontWeight: '800', marginTop: 12 },
  actionText: { color: '#64748B', fontSize: 13, lineHeight: 19, marginTop: 5 },
  actionLink: { color: '#176B4D', fontSize: 13, fontWeight: '700', marginTop: 13 },
  panel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 17, padding: 16, marginTop: 10 },
  panelHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  panelCount: { color: '#A84A20', backgroundColor: '#FFF1E8', borderRadius: 10, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 4, fontSize: 12, fontWeight: '800' },
  alertEntry: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#F0F3F7' },
  alertEntryCopy: { flex: 1, marginHorizontal: 10 },
  alertEntryTitle: { color: '#172B4D', fontSize: 13, fontWeight: '800' },
  alertEntryMessage: { color: '#475569', fontSize: 12, marginTop: 3 },
  alertEntryMeta: { color: '#718096', fontSize: 11, marginTop: 4 },
  alertSeverity: { fontSize: 10, fontWeight: '800', overflow: 'hidden', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  alertSeverityCritical: { color: '#B42318', backgroundColor: '#FEE4E2' },
  alertSeverityWarning: { color: '#A84A20', backgroundColor: '#FFF1E8' },
  paymentSummaryTitle: { color: '#172B4D', fontSize: 14, fontWeight: '800', marginTop: 14, marginBottom: 5 },
  paymentSummaryRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F3F7' },
  paymentSummaryMethod: { flex: 1, color: '#334155', fontSize: 12, fontWeight: '700' },
  paymentSummaryCount: { color: '#718096', fontSize: 11, marginRight: 12 },
  paymentSummaryTotal: { minWidth: 74, color: '#087443', fontSize: 12, fontWeight: '800', textAlign: 'right' },
  paymentSummaryNote: { color: '#718096', fontSize: 10, marginTop: 5 },
  saleEntry: { paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#F0F3F7' },
  saleEntryHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saleEntryDate: { flex: 1, color: '#334155', fontSize: 12, fontWeight: '700' },
  saleEntryTotal: { color: '#087443', fontSize: 13, fontWeight: '800', marginLeft: 10 },
  saleEntryMeta: { color: '#718096', fontSize: 11, marginTop: 5 },
  saleEntryItems: { color: '#475569', fontSize: 12, lineHeight: 18, marginTop: 4 },
  listRow: { minHeight: 43, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F3F7' },
  warningDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E38B2C', marginRight: 10 },
  listText: { flex: 1, color: '#334155', fontSize: 13 },
  stockWarning: { color: '#A84A20', fontSize: 12, fontWeight: '700' },
  mutedText: { color: '#718096', fontSize: 13, lineHeight: 19 },
  restockSummary: { minHeight: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECF1FF', borderRadius: 13, paddingHorizontal: 12, marginBottom: 12 },
  restockSummaryText: { flex: 1, color: '#3159B8', fontSize: 13, fontWeight: '700', marginHorizontal: 9 },
  clearSelection: { color: '#3159B8', fontSize: 12, fontWeight: '700' },
  inventoryItem: { minHeight: 82, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 15, padding: 13, marginBottom: 10 },
  inventoryCopy: { flex: 1, paddingRight: 8 },
  inventoryName: { color: '#172B4D', fontSize: 15, fontWeight: '700' },
  inventoryMeta: { color: '#718096', fontSize: 12, marginTop: 4 },
  inventoryRight: { alignItems: 'flex-end' },
  stockBadge: { backgroundColor: '#EEF2F7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  stockBadgeLow: { backgroundColor: '#FFF1E8' },
  stockBadgeText: { color: '#475569', fontSize: 11, fontWeight: '700' },
  stockBadgeTextLow: { color: '#A84A20' },
  addButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECF1FF', borderRadius: 9, paddingHorizontal: 9, marginTop: 7 },
  addButtonText: { color: '#3159B8', fontSize: 11, fontWeight: '700', marginLeft: 3 },
  removeButton: { backgroundColor: '#E7F5ED' },
  removeButtonText: { color: '#087443' },
  searchWrap: { minHeight: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1E7EF', borderRadius: 13, paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, minWidth: 0, color: '#172B4D', fontSize: 15, paddingVertical: 11, paddingHorizontal: 9 },
  scanToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E7F5ED', borderRadius: 11, paddingHorizontal: 12, marginBottom: 12 },
  scanToggleText: { flex: 1, color: '#176B4D', fontSize: 13, fontWeight: '800', marginHorizontal: 8 },
  scannerPanel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#C8D9D0', borderRadius: 14, padding: 13, marginBottom: 12 },
  scannerTitle: { color: '#172B4D', fontSize: 15, fontWeight: '800' },
  scannerHint: { color: '#64748B', fontSize: 12, lineHeight: 17, marginTop: 4 },
  cameraPreview: { height: 220, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#172B4D', borderRadius: 11, marginTop: 11 },
  cameraFrame: { width: '72%', height: 90, borderWidth: 2, borderColor: '#fff', borderRadius: 10 },
  cameraButton: { minHeight: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#176B4D', borderRadius: 10, marginTop: 11 },
  scannedCodePanel: { backgroundColor: '#F4F7FB', borderRadius: 10, padding: 10, marginTop: 10 },
  scannedCodeLabel: { color: '#64748B', fontSize: 11, fontWeight: '700' },
  scannedCodeValue: { color: '#172B4D', fontSize: 14, fontWeight: '800', marginTop: 3 },
  scanAgainButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7F5ED', borderRadius: 9, marginTop: 8 },
  scanAgainText: { color: '#176B4D', fontSize: 12, fontWeight: '800', marginLeft: 5 },
  simulatorLabel: { color: '#475569', fontSize: 11, fontWeight: '700', marginTop: 13 },
  scannerChoices: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 9 },
  scannerChoice: { maxWidth: '48%', minWidth: '44%', backgroundColor: '#F6F8FB', borderWidth: 1, borderColor: '#E1E7EF', borderRadius: 9, padding: 8, marginRight: '2%', marginBottom: 7 },
  scannerChoiceSelected: { backgroundColor: '#176B4D', borderColor: '#176B4D' },
  scannerChoiceText: { color: '#334155', fontSize: 11, fontWeight: '700' },
  scannerChoiceTextSelected: { color: '#fff' },
  scannerChoiceStock: { color: '#718096', fontSize: 10, marginTop: 3 },
  scanAction: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#176B4D', borderRadius: 10, marginTop: 3 },
  scanActionText: { color: '#fff', fontSize: 12, fontWeight: '800', marginLeft: 6 },
  scanFeedback: { color: '#176B4D', fontSize: 12, fontWeight: '700', marginTop: 8 },
  filterRow: { paddingBottom: 12 },
  filterChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E1E7EF', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, marginRight: 8 },
  filterChipActive: { backgroundColor: '#176B4D', borderColor: '#176B4D' },
  filterText: { color: '#475569', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, marginBottom: 10 },
  resultCount: { color: '#718096', fontSize: 12 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  productCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 15, padding: 12, marginBottom: 10 },
  productCategory: { color: '#718096', fontSize: 11, fontWeight: '600' },
  productName: { minHeight: 38, color: '#172B4D', fontSize: 14, lineHeight: 19, fontWeight: '800', marginTop: 4 },
  productStock: { color: '#718096', fontSize: 11, marginTop: 4 },
  productPrice: { color: '#176B4D', fontSize: 17, fontWeight: '800', marginTop: 10 },
  productButton: { minHeight: 39, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#176B4D', borderRadius: 10, marginTop: 10 },
  productButtonText: { color: '#fff', fontSize: 12, fontWeight: '700', marginLeft: 3 },
  disabledButton: { backgroundColor: '#AAB5C2', opacity: 0.75 },
  emptyState: { alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 15, padding: 24, marginBottom: 14 },
  emptyStateTitle: { color: '#334155', fontSize: 15, fontWeight: '700', marginTop: 8, marginBottom: 4 },
  cartSection: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 17, padding: 15, marginTop: 8 },
  cartHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartMeta: { color: '#718096', fontSize: 12, marginTop: 4 },
  emptyCart: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F8FB', borderRadius: 12, padding: 13, marginTop: 13 },
  emptyCartText: { flex: 1, color: '#64748B', fontSize: 13, lineHeight: 18, marginLeft: 9 },
  cartItem: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEF1F5', paddingVertical: 9 },
  cartItemCopy: { flex: 1, paddingRight: 5 },
  cartName: { color: '#172B4D', fontSize: 13, fontWeight: '700' },
  cartPrice: { color: '#718096', fontSize: 11, marginTop: 3 },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F4F8', borderRadius: 9 },
  qtyButton: { minWidth: 34, minHeight: 36, justifyContent: 'center', alignItems: 'center' },
  qtyText: { minWidth: 22, textAlign: 'center', color: '#172B4D', fontSize: 13, fontWeight: '700' },
  lineTotal: { width: 74, textAlign: 'right', color: '#172B4D', fontSize: 12, fontWeight: '700', marginLeft: 7 },
  totalBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5EAF2', paddingTop: 13, marginTop: 13 },
  totalLabel: { color: '#475569', fontSize: 14, fontWeight: '700' },
  totalStrong: { color: '#172B4D', fontSize: 22, fontWeight: '800' },
  paymentLabel: { color: '#334155', fontSize: 12, fontWeight: '700', marginTop: 14, marginBottom: 8 },
  paymentOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paymentOption: { flexGrow: 1, flexBasis: '45%', minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 10 },
  paymentOptionActive: { backgroundColor: '#176B4D' },
  paymentOptionText: { color: '#475569', fontSize: 12, fontWeight: '700', marginLeft: 6 },
  paymentOptionTextActive: { color: '#fff' },
  checkoutButton: { minHeight: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#176B4D', borderRadius: 12, marginTop: 14 },
  checkoutText: { color: '#fff', fontSize: 14, fontWeight: '800', marginLeft: 7 },
  checkoutNote: { color: '#718096', fontSize: 11, textAlign: 'center', marginTop: 9 },
  receiptPage: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 18 },
  receiptCard: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5EAF2', borderRadius: 20, padding: 20 },
  receiptSuccess: { width: 60, height: 60, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', backgroundColor: '#E7F5ED', borderRadius: 30 },
  receiptFeedback: { borderRadius: 10, padding: 12, fontSize: 12, lineHeight: 18, marginBottom: 10 },
  receiptFeedbackError: { color: '#9B2C2C', backgroundColor: '#FEE2E2' },
  receiptFeedbackSuccess: { color: '#176B4D', backgroundColor: '#E7F5ED' },
  receiptForm: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#C8D9D0', borderRadius: 15, padding: 14, marginTop: -2, marginBottom: 11 },
  receiptFormTitle: { color: '#172B4D', fontSize: 15, fontWeight: '800' },
  receiptFormHint: { color: '#64748B', fontSize: 12, lineHeight: 17, marginTop: 4 },
  receiptFields: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  receiptInput: { width: '48.5%', minHeight: 44, color: '#172B4D', backgroundColor: '#F6F8FB', borderWidth: 1, borderColor: '#E1E7EF', borderRadius: 10, paddingHorizontal: 10, marginBottom: 8, fontSize: 12 },
  receiveButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', backgroundColor: '#E7F5ED', borderRadius: 9, paddingHorizontal: 9, marginTop: 7 },
  receiveButtonText: { color: '#087443', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  confirmReceiptButton: { minHeight: 42, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#176B4D', borderRadius: 10, marginTop: 4 },
  confirmReceiptText: { color: '#fff', fontSize: 12, fontWeight: '800', marginLeft: 5 },
  receiptEntry: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F3F7' },
  receiptTitle: { color: '#172B4D', fontSize: 23, textAlign: 'center', fontWeight: '800', marginTop: 12 },
  receiptSubtitle: { color: '#64748B', fontSize: 13, textAlign: 'center', marginTop: 5, marginBottom: 20 },
  receiptTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F4F7FB', borderRadius: 13, padding: 15, marginBottom: 20 },
  receiptTotalLabel: { color: '#475569', fontSize: 14, fontWeight: '700' },
  receiptTotalValue: { color: '#176B4D', fontSize: 21, fontWeight: '800' },
  receiptRow: { minHeight: 54, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEF1F5' },
  receiptItemCopy: { flex: 1 },
});
