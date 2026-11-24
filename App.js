import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
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
import { toCanvas as bwipToCanvas } from '@bwip-js/browser';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  API_BASE_URL,
  addProductStock,
  configureApiBaseUrl,
  createProduct,
  createSale,
  getSaleStatus,
  listProducts,
  listSales,
} from './assets/js/api';

configureApiBaseUrl(Constants.expoConfig?.extra?.apiBaseUrl || API_BASE_URL);

const categories = ['Todos', 'Abarrotes', 'Bebidas', 'Lácteos', 'Limpieza'];
const paymentMethods = [
  { id: 'Efectivo', icon: 'payments' },
  { id: 'Tarjeta', icon: 'credit-card' },
  { id: 'Yape', icon: 'qr-code-2' },
];
const formatCurrency = (value) => `S/ ${Number(value || 0).toFixed(2)}`;

function generateBarcodeDataUri(barcodeValue) {
  try {
    const text = String(barcodeValue).padEnd(13, '0').slice(0, 13);
    // @bwip-js/browser usa Canvas API del navegador para generar PNG
    const canvas = document.createElement('canvas');
    bwipToCanvas(canvas, {
      bcid: 'ean13',
      text: text,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.warn('No se pudo generar el código de barras:', error);
    return null;
  }
}

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
  const [scanFeedback, setScanFeedback] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const scanLock = useRef(false);
  const [category, setCategory] = useState('Todos');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [lastSale, setLastSale] = useState(null);
  const [sales, setSales] = useState([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [saleCount, setSaleCount] = useState(0);
  const [inventory, setInventory] = useState([]);
  const [restockIds, setRestockIds] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [receivingProductId, setReceivingProductId] = useState(null);
  const [receiptQuantity, setReceiptQuantity] = useState('24');
  const [receiptSupplier, setReceiptSupplier] = useState('');
  const [receiptLot, setReceiptLot] = useState('');
  const [receiptExpiration, setReceiptExpiration] = useState('');
  const [receiptFeedback, setReceiptFeedback] = useState(null);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductStock, setNewProductStock] = useState('0');
  const [newProductBarcode, setNewProductBarcode] = useState('');
  const [newProductFeedback, setNewProductFeedback] = useState(null);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [backendReload, setBackendReload] = useState(0);
  const [checkoutError, setCheckoutError] = useState('');
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [isReceivingStock, setIsReceivingStock] = useState(false);
  const [iaTab, setIaTab] = useState('riesgo');
  const [iaRiesgoData, setIaRiesgoData] = useState(null);
  const [iaReposicionData, setIaReposicionData] = useState(null);
  const [iaMetricasData, setIaMetricasData] = useState(null);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaError, setIaError] = useState('');
  const [yapeWaiting, setYapeWaiting] = useState(false);
  const [yapeTotal, setYapeTotal] = useState(0);
  const pollingTimerRef = useRef(null);
  const [qrProductId, setQrProductId] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const lastScanTimeRef = useRef(0);

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
  const [bellAnimation] = useState(() => new Animated.Value(0));
  const bellRotation = bellAnimation.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-18deg', '18deg'],
  });
  const primaryInventoryAlert = predictiveAlerts[0];

  useEffect(() => {
    let active = true;

    const loadBackendData = async () => {
      setApiLoading(true);
      setApiError('');
      try {
        const [serverInventory, serverSales] = await Promise.all([
          listProducts(),
          listSales(),
        ]);
        if (!active) return;
        setInventory(serverInventory);
        setSales(serverSales);
        setSalesTotal(serverSales.reduce((total, sale) => total + sale.total, 0));
        setSaleCount(serverSales.length);
      } catch (error) {
        console.error('No se pudieron cargar los datos del backend:', error);
        if (active) setApiError(error.message);
      } finally {
        if (active) setApiLoading(false);
      }
    };

    loadBackendData();
    return () => {
      active = false;
    };
  }, [backendReload]);

  const retryBackendConnection = () => {
    setBackendReload((current) => current + 1);
  };

  // ---------------------------------------------------------------------------
  // IA API helpers
  // ---------------------------------------------------------------------------

  const fetchIA = async (path) => {
    const response = await fetch(`${API_BASE_URL}/ia${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Error ${response.status} ${response.statusText}`);
    }
    return response.json();
  };

  const loadIaRiesgo = async () => {
    setIaLoading(true);
    setIaError('');
    try {
      const data = await fetchIA('/riesgo');
      setIaRiesgoData(data);
    } catch (error) {
      setIaError(error.message);
    } finally {
      setIaLoading(false);
    }
  };

  const loadIaReposicion = async () => {
    setIaLoading(true);
    setIaError('');
    try {
      const data = await fetchIA('/reposicion?stockUmbral=15&stockMinimo=30&diasHistorial=30');
      setIaReposicionData(data);
    } catch (error) {
      setIaError(error.message);
    } finally {
      setIaLoading(false);
    }
  };

  const loadIaMetricas = async () => {
    setIaLoading(true);
    setIaError('');
    try {
      const data = await fetchIA('/comparar');
      setIaMetricasData(data);
    } catch (error) {
      setIaError(error.message);
    } finally {
      setIaLoading(false);
    }
  };

  const loadIaTab = (tab) => {
    setIaTab(tab);
    if (tab === 'riesgo') loadIaRiesgo();
    else if (tab === 'reposicion') loadIaReposicion();
    else if (tab === 'metricas') loadIaMetricas();
  };

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

  const zxingReaderRef = useRef(null);
  const zxingStreamRef = useRef(null);
  const zxingIntervalRef = useRef(null);

  const openCameraScanner = async () => {
    try {
      if (Platform.OS === 'web') {
        scanLock.current = false;
        setScannedCode('');
        setScanFeedback('Enfoca el código de barras del producto.');
        setScannerActive(true);
        return;
      }

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
      setScanFeedback('Enfoca el código de barras del producto.');
      setScannerActive(true);
    } catch (error) {
      console.error('No se pudo solicitar acceso a la cámara:', error);
      setScannerActive(false);
      setScanFeedback('No se pudo abrir la cámara. Revisa los permisos del dispositivo.');
    }
  };

  const generateBarcode = (productId) => {
    setQrProductId(productId);
    setShowQrModal(true);
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

  const processScannedCode = useCallback(
    (data) => {
      if (scanLock.current) return;

      const now = Date.now();
      if (now - lastScanTimeRef.current < 2000) {
        return;
      }

      scanLock.current = true;
      setScannerActive(false);
      setScannedCode(data);

      const product = inventory.find((p) => String(p.barcode) === String(data));

      if (!product) {
        setScanFeedback(`Código ${data} no encontrado en el catálogo. Verifica que el producto esté registrado.`);
        scanLock.current = false;
        return;
      }

      const quantityInCart = cart.find((item) => item.id === product.id)?.quantity ?? 0;
      if (quantityInCart >= product.stock) {
        setScanFeedback(`${product.name} ya no tiene stock disponible.`);
        scanLock.current = false;
        return;
      }

      addToCart(product);
      lastScanTimeRef.current = now;
      setScanFeedback(`Escaneado: ${product.name} (+1)`);
    },
    [cart, inventory],
  );

  const handleBarcodeScanned = useCallback(
    ({ data }) => {
      processScannedCode(data);
    },
    [processScannedCode],
  );

  // ZXing web barcode scanner
  useEffect(() => {
    if (Platform.OS !== 'web' || !scannerActive) return;

    let reader = null;
    let stream = null;
    let video = null;
    let interval = null;

    async function startZxingScanner() {
      try {
        reader = new BrowserMultiFormatReader();
        reader.timeBetweenScans = 300;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        zxingStreamRef.current = stream;

        video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        video.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;';

        const container = document.getElementById('zxing-video-container');
        if (container) {
          container.innerHTML = '';
          container.appendChild(video);
        }

        interval = setInterval(() => {
          if (!video || !reader) return;
          reader.decodeFromVideoElement(video, false).then((result) => {
            if (result) {
              processScannedCode(result.getText());
            }
          }).catch(() => {
            // No barcode found
          });
        }, 300);

        zxingReaderRef.current = reader;
        zxingIntervalRef.current = interval;
      } catch (error) {
        console.error('Error al iniciar ZXing scanner:', error);
        setScannerActive(false);
        setScanFeedback('No se pudo iniciar la cámara. Asegúrate de usar HTTPS y dar permisos.');
      }
    }

    startZxingScanner();

    return () => {
      if (interval) clearInterval(interval);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const container = document.getElementById('zxing-video-container');
      if (container) container.innerHTML = '';
      zxingReaderRef.current = null;
      zxingStreamRef.current = null;
      zxingIntervalRef.current = null;
    };
  }, [scannerActive, processScannedCode]);

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

  const finishSale = async (savedSale) => {
    const savedItems = Array.isArray(savedSale.items)
      ? savedSale.items.map((item) => ({
          id: String(item.productoId),
          name: item.nombreProducto,
          price: Number(item.precioUnitario),
          quantity: item.cantidad,
        }))
      : cart.map((item) => ({ ...item }));
    const sale = {
      id: String(savedSale.id ?? `V-${Date.now()}`),
      soldAt: savedSale.fecha ?? new Date().toISOString(),
      cashier: savedSale.cajero ?? 'Cajero de turno',
      terminal: savedSale.terminal ?? 'Caja 01',
      paymentMethod,
      items: savedItems,
      total: Number(savedSale.total ?? subtotal),
      itemCount: totalItems,
    };
    setLastSale(sale);
    setSales((currentSales) => [sale, ...currentSales]);
    setSalesTotal((total) => total + sale.total);
    setSaleCount((count) => count + 1);
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

    try {
      setInventory(await listProducts());
    } catch (error) {
      console.error('La venta se guardó, pero no se pudo actualizar el inventario:', error);
      setApiError(`La venta sí se guardó, pero no se pudo actualizar el inventario: ${error.message}`);
    }
  };

  const stopYapePolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  const checkout = async () => {
    if (cart.length === 0 || isSubmittingSale) return;
    setIsSubmittingSale(true);
    setCheckoutError('');
    try {
      const savedSale = await createSale({
        cashier: 'Cajero de turno',
        terminal: 'Caja 01',
        paymentMethod,
        items: cart.map((product) => ({ product, quantity: product.quantity })),
      });

      // Si es Yape, mostrar QR y esperar confirmación
      if (paymentMethod === 'Yape') {
        const saleId = savedSale.id;
        setYapeTotal(Number(savedSale.total ?? subtotal));
        setYapeWaiting(true);
        setIsSubmittingSale(false);

        // Polling cada 3 segundos para verificar el estado
        pollingTimerRef.current = setInterval(async () => {
          try {
            const status = await getSaleStatus(saleId);
            if (status.estado === 'PAGADA') {
              stopYapePolling();
              setYapeWaiting(false);
              await finishSale(savedSale);
            }
          } catch (error) {
            console.error('Error al verificar estado de venta Yape:', error);
          }
        }, 3000);
        return;
      }

      await finishSale(savedSale);
    } catch (error) {
      console.error('No se pudo registrar la venta:', error);
      setCheckoutError(error.message);
    } finally {
      if (paymentMethod !== 'Yape') {
        setIsSubmittingSale(false);
      }
    }
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

  const receiveStock = async (product) => {
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

    setIsReceivingStock(true);
    try {
      const updatedProduct = await addProductStock(product.id, quantity);
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
          item.id === updatedProduct.id ? updatedProduct : item,
        ),
      );
      setReceipts((currentReceipts) => [receipt, ...currentReceipts]);
      setReceivingProductId(null);
      setReceiptFeedback({
        type: 'success',
        message: `Stock actualizado en el backend: ${quantity} unidades de ${product.name}. Los datos del lote son locales a esta sesión.`,
      });
    } catch (error) {
      console.error('No se pudo registrar el ingreso de stock:', error);
      setReceiptFeedback({ type: 'error', message: error.message });
    } finally {
      setIsReceivingStock(false);
    }
  };

  const resetNewProductForm = () => {
    setShowNewProductForm(false);
    setNewProductName('');
    setNewProductCategory('');
    setNewProductPrice('');
    setNewProductStock('0');
    setNewProductBarcode('');
    setNewProductFeedback(null);
  };

  const handleCreateProduct = async () => {
    if (!newProductName.trim()) {
      setNewProductFeedback({ type: 'error', message: 'Escribe el nombre del producto.' });
      return;
    }
    const price = parseFloat(newProductPrice);
    if (Number.isNaN(price) || price < 0) {
      setNewProductFeedback({ type: 'error', message: 'Ingresa un precio válido mayor o igual a cero.' });
      return;
    }
    const stock = parseInt(newProductStock, 10);
    if (Number.isNaN(stock) || stock < 0) {
      setNewProductFeedback({ type: 'error', message: 'Ingresa un stock válido mayor o igual a cero.' });
      return;
    }

    try {
      const created = await createProduct({
        name: newProductName.trim(),
        category: newProductCategory.trim(),
        price,
        stock,
        barcode: newProductBarcode.trim(),
      });
      setInventory((current) => [...current, created]);
      setNewProductFeedback({
        type: 'success',
        message: `${created.name} creado exitosamente con código de barras ${created.barcode || 'auto-generado'}.`,
      });
      setNewProductName('');
      setNewProductCategory('');
      setNewProductPrice('');
      setNewProductStock('0');
      setNewProductBarcode('');
    } catch (error) {
      console.error('No se pudo crear el producto:', error);
      setNewProductFeedback({ type: 'error', message: error.message });
    }
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
      {apiLoading || apiError ? (
        <View style={styles.apiStatus}>
          <Text style={[styles.apiStatusText, apiError && styles.apiStatusTextError]}>
            {apiError
              ? `Error de conexión con el backend: ${apiError}`
              : 'Sincronizando datos con el backend…'}
          </Text>
          {apiError ? (
            <TouchableOpacity accessibilityRole="button" onPress={retryBackendConnection}>
              <Text style={styles.apiRetry}>Reintentar</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
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

          <View style={styles.apiStatus}>
            <Text style={[styles.apiStatusText, apiError && styles.apiStatusTextError]}>
              {apiLoading
                ? 'Conectando con el backend…'
                : apiError
                  ? `No se pudieron cargar los datos: ${apiError}`
                  : 'Productos, ventas y stock conectados al backend.'}
            </Text>
            {apiError ? (
              <TouchableOpacity accessibilityRole="button" onPress={retryBackendConnection}>
                <Text style={styles.apiRetry}>Reintentar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
        label: 'Total vendido',
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
          <Text style={styles.sectionHint}>Indicadores sincronizados con el backend.</Text>

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

            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.actionCard, isWide && styles.actionCardWide]}
              onPress={() => { setIaTab('riesgo'); setIaError(''); loadIaRiesgo(); setScreen('ia'); }}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
                <MaterialIcons name="insights" size={25} color="#7650B5" />
              </View>
              <Text style={styles.actionTitle}>IA Predictiva</Text>
              <Text style={styles.actionText}>Algoritmos de búsqueda, regresión y clasificación.</Text>
              <Text style={styles.actionLink}>Ver panel de IA  ›</Text>
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
            <Text style={styles.paymentSummaryNote}>Acumulado de las ventas registradas en el backend.</Text>
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

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setShowNewProductForm((current) => !current)}
          style={styles.newProductButton}
        >
          <MaterialIcons name={showNewProductForm ? 'expand-less' : 'add-circle-outline'} size={20} color="#087443" />
          <Text style={styles.newProductButtonText}>
            {showNewProductForm ? 'Cerrar formulario' : 'Agregar nuevo producto'}
          </Text>
        </TouchableOpacity>

        {showNewProductForm ? (
          <View style={styles.newProductForm}>
            <Text style={styles.newProductFormTitle}>Registrar producto nuevo</Text>
            <Text style={styles.newProductFormHint}>
              Completa los datos del producto. El código de barras se generará automáticamente si no lo proporcionas.
            </Text>
            {newProductFeedback ? (
              <Text
                accessibilityRole={newProductFeedback.type === 'error' ? 'alert' : 'text'}
                style={[
                  styles.receiptFeedback,
                  newProductFeedback.type === 'error'
                    ? styles.receiptFeedbackError
                    : styles.receiptFeedbackSuccess,
                ]}
              >
                {newProductFeedback.message}
              </Text>
            ) : null}
            <View style={styles.receiptFields}>
              <TextInput
                accessibilityLabel="Nombre del producto"
                onChangeText={setNewProductName}
                placeholder="Nombre (por ejemplo, Galletas Oreo)"
                value={newProductName}
                style={styles.receiptInput}
              />
              <TextInput
                accessibilityLabel="Categoría"
                onChangeText={setNewProductCategory}
                placeholder="Categoría (por ejemplo, Abarrotes)"
                value={newProductCategory}
                style={styles.receiptInput}
              />
              <TextInput
                accessibilityLabel="Precio"
                keyboardType="decimal-pad"
                onChangeText={setNewProductPrice}
                placeholder="Precio (por ejemplo, 3.50)"
                value={newProductPrice}
                style={styles.receiptInput}
              />
              <TextInput
                accessibilityLabel="Stock inicial"
                keyboardType="number-pad"
                onChangeText={setNewProductStock}
                placeholder="Stock inicial (por ejemplo, 50)"
                value={newProductStock}
                style={styles.receiptInput}
              />
              <TextInput
                accessibilityLabel="Código de barras (opcional)"
                keyboardType="number-pad"
                onChangeText={setNewProductBarcode}
                placeholder="Código de barras (opcional, se genera automáticamente)"
                value={newProductBarcode}
                style={styles.receiptInput}
              />
            </View>
            <View style={styles.newProductActions}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={resetNewProductForm}
                style={styles.cancelNewProductButton}
              >
                <Text style={styles.cancelNewProductText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleCreateProduct}
                style={styles.confirmNewProductButton}
              >
                <MaterialIcons name="check" size={18} color="#fff" />
                <Text style={styles.confirmNewProductText}>Crear producto</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

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
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => generateBarcode(product.id)}
                    style={styles.qrButton}
                  >
                    <MaterialIcons name="view-carousel" size={17} color="#7C3AED" />
                    <Text style={styles.qrButtonText}>Ver código de barras</Text>
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
                    disabled={isReceivingStock}
                    onPress={() => receiveStock(product)}
                    style={[
                      styles.confirmReceiptButton,
                      isReceivingStock && styles.disabledButton,
                    ]}
                  >
                    <MaterialIcons name="check" size={18} color="#fff" />
                    <Text style={styles.confirmReceiptText}>
                      {isReceivingStock ? 'Guardando ingreso…' : 'Confirmar recepción'}
                    </Text>
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
          El stock se guarda en el backend. Proveedor, lote y vencimiento se conservan solo durante esta sesión.
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
            if (scannerOpen) {
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
              Usa la cámara para leer el código de barras del producto. El código debe ser un EAN-13 de 13 dígitos.
            </Text>
            {scannerActive ? (
              <View style={styles.cameraPreview}>
                {Platform.OS === 'web' ? (
                  <View
                    collapsable={false}
                    style={{ width: '100%', height: '100%' }}
                    id="zxing-video-container"
                    accessibilityLabel="Vista previa de la cámara para escanear"
                  />
                ) : (
                  <>
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
                  </>
                )}
              </View>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={openCameraScanner}
                style={styles.cameraButton}
              >
                <MaterialIcons name="photo-camera" size={19} color="#fff" />
                <Text style={styles.scanActionText}>
                  Abrir cámara
                </Text>
              </TouchableOpacity>
            )}
            {scannedCode ? (
              <View style={styles.scannedCodePanel}>
                <Text style={styles.scannedCodeLabel}>Código detectado</Text>
                <Text selectable style={styles.scannedCodeValue}>{scannedCode}</Text>
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
          <Text style={styles.paymentLabel}>Medio de pago</Text>
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
            disabled={cart.length === 0 || isSubmittingSale}
            onPress={checkout}
            style={[
              styles.checkoutButton,
              (cart.length === 0 || isSubmittingSale) && styles.disabledButton,
            ]}
          >
            <MaterialIcons name="payments" size={20} color="#fff" />
            <Text style={styles.checkoutText}>
              {isSubmittingSale ? 'Guardando venta…' : 'Registrar venta'}
            </Text>
          </TouchableOpacity>
          {checkoutError ? (
            <Text accessibilityRole="alert" style={styles.receiptFeedbackError}>
              No se pudo guardar la venta: {checkoutError}
            </Text>
          ) : null}
          <Text style={styles.checkoutNote}>La venta y el descuento de stock se guardan en el backend.</Text>
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
            Venta guardada en el backend con medio de pago {lastSale?.paymentMethod}.
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

  // ---------------------------------------------------------------------------
  // IA Predictive Screen
  // ---------------------------------------------------------------------------

  const renderIAScreen = () => {
    const tabs = [
      { id: 'riesgo', label: 'Riesgo', icon: 'warning' },
      { id: 'reposicion', label: 'Reposición', icon: 'inventory-2' },
      { id: 'metricas', label: 'Métricas', icon: 'analytics' },
    ];

    const renderIaTabs = () => (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            accessibilityRole="button"
            onPress={() => loadIaTab(tab.id)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 10,
              backgroundColor: iaTab === tab.id ? '#7650B5' : '#F0F3F7',
            }}
          >
            <MaterialIcons
              name={tab.icon}
              size={16}
              color={iaTab === tab.id ? '#fff' : '#64748B'}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: iaTab === tab.id ? '#fff' : '#64748B',
                marginLeft: 6,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );

    const renderIaLoading = () => (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <Text style={{ color: '#64748B', fontSize: 14 }}>Cargando datos de IA...</Text>
      </View>
    );

    const renderIaError = () => (
      <View style={{ padding: 16, backgroundColor: '#FEE4E2', borderRadius: 12, borderWidth: 1, borderColor: '#FDA29B' }}>
        <Text style={{ color: '#9B1C1C', fontSize: 13 }}>{iaError}</Text>
      </View>
    );

    const renderRiesgoTab = () => {
      if (iaLoading) return renderIaLoading();
      if (iaError) return renderIaError();
      if (!iaRiesgoData || iaRiesgoData.length === 0) {
        return (
          <View style={{ padding: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5EAF2', alignItems: 'center' }}>
            <MaterialIcons name="info" size={40} color="#94A3B8" />
            <Text style={{ color: '#64748B', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
              No hay datos suficientes para clasificar el riesgo. Registra más ventas para alimentar los modelos.
            </Text>
          </View>
        );
      }

      const alto = iaRiesgoData.filter((a) => a.riesgo === 'ALTO').length;
      const medio = iaRiesgoData.filter((a) => a.riesgo === 'MEDIO').length;
      const bajo = iaRiesgoData.filter((a) => a.riesgo === 'BAJO').length;

      return (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, padding: 12, backgroundColor: '#FEE4E2', borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#9B1C1C' }}>{alto}</Text>
              <Text style={{ fontSize: 11, color: '#9B1C1C' }}>Riesgo Alto</Text>
            </View>
            <View style={{ flex: 1, padding: 12, backgroundColor: '#FFF7ED', borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#C2410C' }}>{medio}</Text>
              <Text style={{ fontSize: 11, color: '#C2410C' }}>Riesgo Medio</Text>
            </View>
            <View style={{ flex: 1, padding: 12, backgroundColor: '#F0FDF9', borderRadius: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#065F46' }}>{bajo}</Text>
              <Text style={{ fontSize: 11, color: '#065F46' }}>Riesgo Bajo</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
            5 modelos: Regresión Logística, SVM, KNN, Árbol de Decisión, AdaBoost
          </Text>
          {iaRiesgoData
            .sort((a, b) => {
              const order = { ALTO: 0, MEDIO: 1, BAJO: 2 };
              return (order[a.riesgo] ?? 3) - (order[b.riesgo] ?? 3);
            })
            .map((a, idx) => {
              const color = a.riesgo === 'ALTO' ? '#9B1C1C' : a.riesgo === 'MEDIO' ? '#C2410C' : '#065F46';
              const bg = a.riesgo === 'ALTO' ? '#FEE4E2' : a.riesgo === 'MEDIO' ? '#FFF7ED' : '#F0FDF9';
              return (
                <View key={idx} style={{ padding: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5EAF2' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#172B4D' }}>{a.nombreProducto}</Text>
                      <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                        Stock: {a.stockActual} | Demanda: {a.demandaPromedio?.toFixed(1) ?? 'N/A'}
                      </Text>
                      {a.motivo ? <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{a.motivo}</Text> : null}
                    </View>
                    <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: bg }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color }}>{a.riesgo}</Text>
                    </View>
                  </View>
                  {a.probabilidadRiesgo !== undefined ? (
                    <View style={{ marginTop: 8, height: 4, backgroundColor: '#F0F3F7', borderRadius: 2 }}>
                      <View style={{ width: `${Math.round(a.probabilidadRiesgo * 100)}%`, height: 4, borderRadius: 2, backgroundColor: color }} />
                    </View>
                  ) : null}
                </View>
              );
            })}
        </View>
      );
    };

    const renderReposicionTab = () => {
      if (iaLoading) return renderIaLoading();
      if (iaError) return renderIaError();
      if (!iaReposicionData) {
        return (
          <View style={{ padding: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5EAF2', alignItems: 'center' }}>
            <MaterialIcons name="info" size={40} color="#94A3B8" />
            <Text style={{ color: '#64748B', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
              No se pudo cargar el plan de reposición.
            </Text>
          </View>
        );
      }

      const algorithms = [
        { key: 'bfs', name: 'BFS', desc: 'Búsqueda en anchura' },
        { key: 'dfs', name: 'DFS', desc: 'Búsqueda en profundidad' },
        { key: 'aStar', name: 'A*', desc: 'Búsqueda heurística' },
        { key: 'hillClimbing', name: 'Hill Climbing', desc: 'Ascensión de colinas' },
      ];

      return (
        <View style={{ gap: 12 }}>
          {algorithms.map((algo) => {
            const r = iaReposicionData[algo.key];
            if (!r) return null;
            const pasos = r.pasos || [];
            return (
              <View key={algo.key} style={{ padding: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5EAF2' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#172B4D' }}>{algo.name}</Text>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#ECF1FF' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#3159B8' }}>Costo: {r.costoTotal?.toFixed(2) ?? 0}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: '#94A3B8', marginBottom: 8 }}>{algo.desc}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: pasos.length > 0 ? 8 : 0 }}>
                  <View style={{ flex: 1, padding: 8, backgroundColor: '#F0F3F7', borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#172B4D' }}>{r.nodosExpandidos ?? 0}</Text>
                    <Text style={{ fontSize: 10, color: '#64748B' }}>Nodos</Text>
                  </View>
                  <View style={{ flex: 1, padding: 8, backgroundColor: '#F0F3F7', borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#172B4D' }}>{(r.tiempoMs ?? 0).toFixed(2)}</Text>
                    <Text style={{ fontSize: 10, color: '#64748B' }}>ms</Text>
                  </View>
                </View>
                {pasos.length > 0 ? (
                  <View style={{ maxHeight: 150 }}>
                    {pasos.map((p, i) => (
                      <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F0F3F7' }}>
                        <Text style={{ fontSize: 12, color: '#172B4D' }}>{p.orden}. {p.nombreProducto}</Text>
                        <Text style={{ fontSize: 12, color: '#64748B' }}>{p.cantidad} unid. (S/ {p.costo?.toFixed(2)})</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', padding: 12 }}>No se requieren reposiciones</Text>
                )}
              </View>
            );
          })}
        </View>
      );
    };

    const renderMetricasTab = () => {
      if (iaLoading && !iaMetricasData) return renderIaLoading();
      if (iaError && !iaMetricasData) return renderIaError();
      if (!iaMetricasData || iaMetricasData.length === 0) {
        return (
          <View style={{ padding: 24, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5EAF2', alignItems: 'center' }}>
            <MaterialIcons name="info" size={40} color="#94A3B8" />
            <Text style={{ color: '#64748B', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
              No hay datos suficientes para calcular métricas. Registra más ventas.
            </Text>
          </View>
        );
      }

      return (
        <View style={{ gap: 12 }}>
          {iaMetricasData.map((m, idx) => {
            const f1Val = m.f1Score ?? 0;
            const f1Color = f1Val >= 0.8 ? '#065F46' : f1Val >= 0.5 ? '#C2410C' : '#9B1C1C';
            const f1Bg = f1Val >= 0.8 ? '#F0FDF9' : f1Val >= 0.5 ? '#FFF7ED' : '#FEE4E2';
            return (
              <View key={idx} style={{ padding: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5EAF2' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#172B4D' }}>{m.modelo}</Text>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: f1Bg }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: f1Color }}>F1: {m.f1Score?.toFixed(3) ?? 'N/A'}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, padding: 8, backgroundColor: '#F0F3F7', borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#172B4D' }}>{m.precision !== undefined ? (m.precision * 100).toFixed(1) + '%' : 'N/A'}</Text>
                    <Text style={{ fontSize: 10, color: '#64748B' }}>Precisión</Text>
                  </View>
                  <View style={{ flex: 1, padding: 8, backgroundColor: '#F0F3F7', borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#172B4D' }}>{m.recall !== undefined ? (m.recall * 100).toFixed(1) + '%' : 'N/A'}</Text>
                    <Text style={{ fontSize: 10, color: '#64748B' }}>Recall</Text>
                  </View>
                  <View style={{ flex: 1, padding: 8, backgroundColor: '#F0F3F7', borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#172B4D' }}>{m.verdaderosPositivos ?? 'N/A'}</Text>
                    <Text style={{ fontSize: 10, color: '#64748B' }}>VP</Text>
                  </View>
                  <View style={{ flex: 1, padding: 8, backgroundColor: '#F0F3F7', borderRadius: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#172B4D' }}>{m.falsosPositivos ?? 'N/A'}</Text>
                    <Text style={{ fontSize: 10, color: '#64748B' }}>FP</Text>
                  </View>
                </View>
              </View>
            );
          })}
          <View style={{ padding: 12, backgroundColor: '#F3E8FF', borderRadius: 12, borderWidth: 1, borderColor: '#E9D5FF' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#7650B5', marginBottom: 4 }}>Interpretación</Text>
            <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 16 }}>
              <Text style={{ fontWeight: '600' }}>Precisión:</Text> Proporción de predicciones positivas correctas.{' '}
              <Text style={{ fontWeight: '600' }}>Recall:</Text> Capacidad de detectar positivos reales.{' '}
              <Text style={{ fontWeight: '600' }}>F1:</Text> Media armónica de precisión y recall.{' '}
              <Text style={{ fontWeight: '600' }}>AdaBoost:</Text> Combina clasificadores débiles para mejorar la precisión general.
            </Text>
          </View>
        </View>
      );
    };

    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.pageContent}>
          {renderHeader('IA Predictiva', 'Panel de Inteligencia Artificial', () => setScreen('dashboard'))}
          <Text style={styles.sectionHint}>
            Algoritmos de búsqueda, regresión y clasificación para la gestión inteligente del minimarket.
          </Text>
          {renderIaTabs()}
          {iaTab === 'riesgo' ? renderRiesgoTab() : null}
          {iaTab === 'reposicion' ? renderReposicionTab() : null}
          {iaTab === 'metricas' ? renderMetricasTab() : null}
        </ScrollView>
      </SafeAreaView>
    );
  };

  // Modal de espera de pago Yape con QR
  const renderYapeWaitingModal = () => {
    if (!yapeWaiting) return null;
    return (
      <Modal visible={yapeWaiting} animationType="fade" transparent>
        <View style={styles.yapeModalOverlay}>
          <View style={styles.yapeModalCard}>
            <View style={styles.yapeModalHeader}>
              <MaterialIcons name="qr-code-2" size={32} color="#6C63FF" />
              <Text style={styles.yapeModalTitle}>Escanea el QR para pagar</Text>
            </View>
            <Text style={styles.yapeModalAmount}>{formatCurrency(yapeTotal)}</Text>
            <View style={styles.yapeQrContainer}>
              <Image
                source={require('./qr-yape.png.jpeg')}
                style={styles.yapeQrImage}
                resizeMode="contain"
              />
            </View>
            <View style={styles.yapeWaitingRow}>
              <ActivityIndicator size="small" color="#6C63FF" />
              <Text style={styles.yapeWaitingText}>Esperando confirmación del yapeo...</Text>
            </View>
            <Text style={styles.yapeWaitingHint}>
              El pago se confirmará automáticamente cuando recibas la notificación.
            </Text>
            <TouchableOpacity
              style={styles.yapeCancelBtn}
              onPress={() => {
                stopYapePolling();
                setYapeWaiting(false);
                setIsSubmittingSale(false);
              }}
            >
              <Text style={styles.yapeCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Modal de código de barras del producto
  const renderProductBarcodeModal = () => {
    const product = inventory.find((p) => String(p.id) === String(qrProductId));
    if (!product || !showQrModal) return null;
    const barcodeValue = product.barcode;
    const barcodeImageUri = barcodeValue ? generateBarcodeDataUri(barcodeValue) : null;
    return (
      <Modal visible={showQrModal} animationType="fade" transparent>
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalCard}>
            <Text style={styles.qrModalTitle}>{product.name}</Text>
            <Text style={styles.qrModalCategory}>{product.category}</Text>
            <View style={styles.barcodeContainer}>
              {barcodeImageUri ? (
                <Image source={{ uri: barcodeImageUri }} style={{ width: 240, height: 80 }} resizeMode="contain" />
              ) : (
                <Text style={styles.noBarcodeText}>Este producto no tiene código de barras asignado.</Text>
              )}
            </View>
            <Text style={styles.qrModalData}>{barcodeValue ?? 'Sin código'}</Text>
            <Text style={styles.qrModalHint}>
              Escanea este código de barras en el punto de venta para agregar el producto al carrito.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setShowQrModal(false)}
              style={styles.qrModalCloseBtn}
            >
              <MaterialIcons name="close" size={20} color="#fff" />
              <Text style={styles.qrModalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderCurrentScreen = () => {
    if (screen === 'login') return renderLoginScreen();
    if (screen === 'dashboard') return renderDashboardScreen();
    if (screen === 'inventory') return renderInventoryScreen();
    if (screen === 'ia') return renderIAScreen();
    if (screen === 'receipt') return renderReceiptScreen();
    return renderPosScreen();
  };

  return (
    <View style={{ flex: 1 }}>
      {renderCurrentScreen()}
      {renderYapeWaitingModal()}
      {renderProductBarcodeModal()}
    </View>
  );
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
  apiStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 12 },
  apiStatusText: { flex: 1, color: '#3159B8', fontSize: 12, lineHeight: 17 },
  apiStatusTextError: { color: '#B42318' },
  apiRetry: { color: '#3159B8', fontSize: 12, fontWeight: '800', marginLeft: 10 },
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
  // Yape QR modal styles
  yapeModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  yapeModalCard: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  yapeModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  yapeModalTitle: { color: '#172B4D', fontSize: 18, fontWeight: '800', marginLeft: 10 },
  yapeModalAmount: { color: '#176B4D', fontSize: 32, fontWeight: '800', marginVertical: 12 },
  yapeQrContainer: { width: 220, height: 220, backgroundColor: '#fff', borderWidth: 2, borderColor: '#E5EAF2', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginVertical: 12 },
  yapeQrImage: { width: 200, height: 200 },
  yapeWaitingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  yapeWaitingText: { color: '#6C63FF', fontSize: 14, fontWeight: '700', marginLeft: 8 },
  yapeWaitingHint: { color: '#718096', fontSize: 11, textAlign: 'center', marginTop: 6, marginBottom: 16 },
  yapeCancelBtn: { minHeight: 42, backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10, marginTop: 4 },
  yapeCancelText: { color: '#64748B', fontSize: 14, fontWeight: '700' },
  // Barcode Product modal styles
  qrButton: { minHeight: 34, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E8FF', borderRadius: 9, paddingHorizontal: 9, marginTop: 7 },
  qrButtonText: { color: '#7C3AED', fontSize: 11, fontWeight: '700', marginLeft: 4 },
  qrModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  qrModalCard: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  qrModalTitle: { color: '#172B4D', fontSize: 20, fontWeight: '800' },
  qrModalCategory: { color: '#718096', fontSize: 13, marginTop: 4, marginBottom: 16 },
  barcodeContainer: { width: 280, height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderWidth: 2, borderColor: '#E5EAF2', borderRadius: 16, marginVertical: 12 },
  noBarcodeText: { color: '#94A3B8', fontSize: 13, textAlign: 'center' },
  qrModalData: { color: '#475569', fontSize: 14, fontWeight: '700', marginTop: 8, marginBottom: 4, letterSpacing: 3 },
  qrModalHint: { color: '#718096', fontSize: 12, textAlign: 'center', lineHeight: 17, marginBottom: 16 },
  qrModalCloseBtn: { minHeight: 42, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#176B4D', borderRadius: 10, width: '100%' },
  qrModalCloseText: { color: '#fff', fontSize: 14, fontWeight: '800', marginLeft: 6 },
  // New product form styles
  newProductButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7F5ED', borderRadius: 11, paddingHorizontal: 14, marginTop: 10, marginBottom: 8 },
  newProductButtonText: { color: '#087443', fontSize: 13, fontWeight: '800', marginLeft: 6 },
  newProductForm: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#C8D9D0', borderRadius: 15, padding: 14, marginBottom: 11 },
  newProductFormTitle: { color: '#172B4D', fontSize: 16, fontWeight: '800' },
  newProductFormHint: { color: '#64748B', fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 8 },
  newProductActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  cancelNewProductButton: { minHeight: 40, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F1F5F9', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cancelNewProductText: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  confirmNewProductButton: { minHeight: 40, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: '#176B4D', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  confirmNewProductText: { color: '#fff', fontSize: 13, fontWeight: '800', marginLeft: 5 },
});
