<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# vamos a usar datos mock para las transacciones de mx com, y lo relacionado, solo se usaran datos reales q introduzca el usaurio ya que esto es un mock app semi funcional para un hackathon

Perfecto, entiendo. Vamos a adaptar la arquitectura v3.0 para usar **datos mock/simulados** para todo lo relacionado con MX y la conectividad bancaria, mientras que los datos ingresados manualmente por el usuario serán reales. Esto es ideal para un hackathon donde necesitas una demo funcional sin integraciones reales.[^1][^2][^3]

# Spendly v3.0 - Versión Hackathon (Mock + Real Data)

**Demo Semi-Funcional con Datos Simulados**

***

## Estrategia de Datos: Mock vs Real

### 🎭 Datos MOCK (Simulados)

```javascript
// Todo lo relacionado con MX y conexión bancaria
✅ Transacciones bancarias automáticas
✅ Conexión de cuentas bancarias
✅ Verificación instantánea de cuentas
✅ Datos agregados urbanos (de otros usuarios)
✅ Estadísticas de zonas
✅ Dashboard de empresas/gobierno
```


### ✍️ Datos REALES (Usuario ingresa)

```javascript
// Datos que el usuario introduce manualmente
✅ Gastos manuales (WhatsApp bot o formulario)
✅ Metas de ahorro
✅ Presupuestos personales
✅ Preferencias de categorías
✅ Consentimientos de compartir datos
✅ Canje de CivicPoints (simulado pero con flujo real)
```


***

## Arquitectura Mock para Hackathon

### 1. Mock Service de MX Banking[^2][^3]

```javascript
// services/mockMXService.js
import { faker } from '@faker-js/faker';

class MockMXService {
  constructor() {
    // Simular delay de API real
    this.apiDelay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Generar usuario demo con cuentas bancarias mock
  async generateDemoUser(userId: string) {
    await this.apiDelay(800);
    
    const accounts = [
      {
        guid: faker.string.uuid(),
        name: 'Cuenta de Cheques BBVA',
        type: 'CHECKING',
        balance: faker.number.float({ min: 500, max: 25000, precision: 0.01 }),
        accountNumber: '****' + faker.string.numeric(4),
        currency: 'MXN',
        institution: 'BBVA México',
        institutionLogo: '/logos/bbva.png'
      },
      {
        guid: faker.string.uuid(),
        name: 'Tarjeta de Crédito Banorte',
        type: 'CREDIT_CARD',
        balance: -faker.number.float({ min: 1000, max: 8000, precision: 0.01 }),
        accountNumber: '****' + faker.string.numeric(4),
        currency: 'MXN',
        institution: 'Banorte',
        institutionLogo: '/logos/banorte.png',
        creditLimit: 30000
      },
      {
        guid: faker.string.uuid(),
        name: 'Cuenta de Ahorro Nu',
        type: 'SAVINGS',
        balance: faker.number.float({ min: 5000, max: 50000, precision: 0.01 }),
        accountNumber: '****' + faker.string.numeric(4),
        currency: 'MXN',
        institution: 'Nu México',
        institutionLogo: '/logos/nu.png'
      }
    ];
    
    // Guardar en localStorage o DB
    await this.saveUserAccounts(userId, accounts);
    
    return accounts;
  }
  
  // Generar transacciones mock realistas
  async generateMockTransactions(accountGuid: string, days: number = 30) {
    await this.apiDelay(1000);
    
    const transactions = [];
    const now = new Date();
    
    // Patrones realistas de gasto
    const patterns = {
      morning: { // 7am - 11am
        categories: ['Café', 'Desayuno', 'Transporte'],
        frequency: 0.7
      },
      afternoon: { // 12pm - 6pm
        categories: ['Comida', 'Uber', 'Compras', 'Supermercado'],
        frequency: 0.8
      },
      evening: { // 7pm - 11pm
        categories: ['Cena', 'Entretenimiento', 'Uber'],
        frequency: 0.6
      }
    };
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Generar transacciones según patrones
      const dayTransactions = this.generateDayTransactions(date, patterns);
      transactions.push(...dayTransactions);
    }
    
    // Agregar algunas transacciones fijas mensuales
    this.addRecurringTransactions(transactions, days);
    
    return transactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }
  
  generateDayTransactions(date: Date, patterns: any) {
    const transactions = [];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    // Café matutino (probabilidad 70% entre semana, 40% fin de semana)
    if (Math.random() < (isWeekend ? 0.4 : 0.7)) {
      transactions.push(this.createTransaction({
        date: this.setTimeOfDay(new Date(date), 8, 30),
        merchant: faker.helpers.arrayElement([
          'Starbucks', 'Oxxo', '7-Eleven', 'Café Local'
        ]),
        amount: faker.number.float({ min: 45, max: 120, precision: 0.01 }),
        category: 'Alimentación',
        subcategory: 'Café',
        icon: '☕',
        location: this.getMockLocation('coffee_shop')
      }));
    }
    
    // Comida (probabilidad 85%)
    if (Math.random() < 0.85) {
      const lunchTime = faker.number.int({ min: 13, max: 15 });
      transactions.push(this.createTransaction({
        date: this.setTimeOfDay(new Date(date), lunchTime, 0),
        merchant: faker.helpers.arrayElement([
          'Tacos Don José', 'Subway', 'Soriana Restaurante', 
          'Little Caesars', 'KFC', 'Comida Corrida'
        ]),
        amount: faker.number.float({ min: 80, max: 250, precision: 0.01 }),
        category: 'Alimentación',
        subcategory: 'Comida',
        icon: '🍽️',
        location: this.getMockLocation('restaurant')
      }));
    }
    
    // Transporte (probabilidad 60% entre semana)
    if (!isWeekend && Math.random() < 0.6) {
      const transportType = faker.helpers.arrayElement([
        { merchant: 'Uber', min: 50, max: 180 },
        { merchant: 'DiDi', min: 45, max: 170 },
        { merchant: 'Metrorrey', min: 8, max: 20 }
      ]);
      
      transactions.push(this.createTransaction({
        date: this.setTimeOfDay(new Date(date), 18, 30),
        merchant: transportType.merchant,
        amount: faker.number.float({ 
          min: transportType.min, 
          max: transportType.max, 
          precision: 0.01 
        }),
        category: 'Transporte',
        subcategory: transportType.merchant,
        icon: '🚗',
        location: {
          origin: this.getMockLocation('work'),
          destination: this.getMockLocation('home')
        }
      }));
    }
    
    // Compras ocasionales (15% de probabilidad)
    if (Math.random() < 0.15) {
      const stores = [
        { merchant: 'Amazon', min: 200, max: 1500, category: 'Compras', icon: '📦' },
        { merchant: 'Mercado Libre', min: 150, max: 2000, category: 'Compras', icon: '🛒' },
        { merchant: 'HEB', min: 300, max: 1200, category: 'Supermercado', icon: '🛒' },
        { merchant: 'Soriana', min: 250, max: 1000, category: 'Supermercado', icon: '🛒' },
        { merchant: 'Cinépolis', min: 120, max: 350, category: 'Entretenimiento', icon: '🎬' }
      ];
      
      const store = faker.helpers.arrayElement(stores);
      transactions.push(this.createTransaction({
        date: this.setTimeOfDay(new Date(date), 19, 0),
        merchant: store.merchant,
        amount: faker.number.float({ min: store.min, max: store.max, precision: 0.01 }),
        category: store.category,
        subcategory: store.merchant,
        icon: store.icon,
        location: this.getMockLocation('store')
      }));
    }
    
    return transactions;
  }
  
  // Transacciones recurrentes mensuales
  addRecurringTransactions(transactions: any[], days: number) {
    if (days >= 30) {
      // Netflix (día 15 de cada mes)
      transactions.push(this.createTransaction({
        date: this.getMonthDay(15),
        merchant: 'Netflix',
        amount: 299,
        category: 'Suscripciones',
        subcategory: 'Streaming',
        icon: '📺',
        isRecurring: true
      }));
      
      // Spotify (día 5)
      transactions.push(this.createTransaction({
        date: this.getMonthDay(5),
        merchant: 'Spotify',
        amount: 129,
        category: 'Suscripciones',
        subcategory: 'Música',
        icon: '🎵',
        isRecurring: true
      }));
      
      // Renta/Luz/Internet (día 1)
      transactions.push(
        this.createTransaction({
          date: this.getMonthDay(1),
          merchant: 'CFE',
          amount: faker.number.float({ min: 800, max: 1500, precision: 0.01 }),
          category: 'Servicios',
          subcategory: 'Luz',
          icon: '💡',
          isRecurring: true
        }),
        this.createTransaction({
          date: this.getMonthDay(1),
          merchant: 'Totalplay',
          amount: 599,
          category: 'Servicios',
          subcategory: 'Internet',
          icon: '🌐',
          isRecurring: true
        })
      );
    }
  }
  
  createTransaction(data: any) {
    return {
      guid: faker.string.uuid(),
      transacted_at: data.date,
      description: data.merchant,
      merchant_name: data.merchant,
      amount: -Math.abs(data.amount), // Negativo para gastos
      category: data.category,
      subcategory: data.subcategory,
      icon: data.icon,
      location: data.location,
      isRecurring: data.isRecurring || false,
      // Calcular CO2 mock
      co2Impact: this.calculateMockCO2(data.category, data.subcategory, data.amount),
      // Marcar como mock
      source: 'mock_data',
      isMock: true
    };
  }
  
  // Calcular huella de carbono mock
  calculateMockCO2(category: string, subcategory: string, amount: number) {
    const co2Rates = {
      'Transporte': {
        'Uber': 2.5,      // kg CO2 por viaje
        'DiDi': 2.3,
        'Metrorrey': 0.4,
        'Bicicleta': 0
      },
      'Alimentación': {
        'Carne': 0.015,   // kg CO2 por peso MXN
        'Vegetariano': 0.005,
        'Café': 0.01
      },
      'Compras': 0.008,   // Promedio
      'Entretenimiento': 0.003,
      'Servicios': 0.002
    };
    
    if (category === 'Transporte' && co2Rates.Transporte[subcategory]) {
      return co2Rates.Transporte[subcategory];
    }
    
    // Default: factor genérico
    return amount * (co2Rates[category] || 0.005);
  }
  
  // Ubicaciones mock para Monterrey
  getMockLocation(type: string) {
    const locations = {
      home: { 
        lat: 25.6866, 
        lng: -100.3161, 
        name: 'San Pedro Garza García',
        gridLat: 25.685,
        gridLng: -100.315
      },
      work: { 
        lat: 25.6514, 
        lng: -100.2895, 
        name: 'Centro de Monterrey',
        gridLat: 25.650,
        gridLng: -100.290
      },
      coffee_shop: {
        lat: 25.6590,
        lng: -100.3050,
        name: 'Valle Oriente',
        gridLat: 25.660,
        gridLng: -100.305
      },
      restaurant: {
        lat: 25.6670,
        lng: -100.3100,
        name: 'Calzada del Valle',
        gridLat: 25.665,
        gridLng: -100.310
      },
      store: {
        lat: 25.6750,
        lng: -100.3400,
        name: 'Plaza Fiesta San Agustín',
        gridLat: 25.675,
        gridLng: -100.340
      }
    };
    
    return locations[type] || locations.home;
  }
  
  // Helpers de fecha
  setTimeOfDay(date: Date, hour: number, minute: number) {
    const newDate = new Date(date);
    newDate.setHours(hour, minute, 0, 0);
    return newDate;
  }
  
  getMonthDay(day: number) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), day, 10, 0, 0);
  }
  
  // Simular widget de conexión (solo UI)
  async createConnectWidget(userId: string) {
    await this.apiDelay(500);
    
    return {
      widgetUrl: '/mock-mx-widget', // Ruta interna a componente React
      mode: 'demo',
      message: 'Esta es una demostración. Selecciona cualquier banco.'
    };
  }
}

export const mockMX = new MockMXService();
```


***

### 2. Generador de Datos Urbanos Agregados[^3]

```javascript
// services/mockUrbanDataService.js
import { faker } from '@faker-js/faker';

class MockUrbanDataService {
  // Generar datos agregados de zona para dashboard
  async generateZoneData(zoneName: string, days: number = 30) {
    const basePopulation = this.getZonePopulation(zoneName);
    const activeUsers = Math.floor(basePopulation * 0.15); // 15% usa Spendly
    
    return {
      zone: zoneName,
      population: basePopulation,
      activeUsers,
      economicActivityIndex: faker.number.int({ min: 35, max: 95 }),
      
      // Datos de movilidad
      mobility: {
        totalTrips: faker.number.int({ min: 50000, max: 300000 }),
        transportDistribution: {
          'Uber/DiDi': faker.number.float({ min: 0.25, max: 0.40, precision: 0.01 }),
          'Transporte Público': faker.number.float({ min: 0.30, max: 0.50, precision: 0.01 }),
          'Auto Propio': faker.number.float({ min: 0.15, max: 0.30, precision: 0.01 }),
          'Bicicleta': faker.number.float({ min: 0.03, max: 0.08, precision: 0.01 })
        },
        peakHours: ['8:00-9:00', '14:00-15:00', '18:00-19:00'],
        averageTripCost: faker.number.float({ min: 60, max: 150, precision: 0.01 }),
        totalCO2: faker.number.float({ min: 450, max: 1200, precision: 0.1 }) // toneladas
      },
      
      // Datos comerciales
      commercial: {
        totalTransactions: faker.number.int({ min: 100000, max: 500000 }),
        categoryBreakdown: {
          'Alimentación': faker.number.float({ min: 0.30, max: 0.45, precision: 0.01 }),
          'Transporte': faker.number.float({ min: 0.15, max: 0.25, precision: 0.01 }),
          'Entretenimiento': faker.number.float({ min: 0.08, max: 0.15, precision: 0.01 }),
          'Compras': faker.number.float({ min: 0.10, max: 0.20, precision: 0.01 }),
          'Servicios': faker.number.float({ min: 0.10, max: 0.18, precision: 0.01 })
        },
        averageTransactionAmount: faker.number.float({ min: 150, max: 350, precision: 0.01 }),
        growthRate: faker.number.float({ min: -0.05, max: 0.15, precision: 0.01 }), // -5% a +15%
        busyHours: ['13:00-15:00', '19:00-21:00']
      },
      
      // Tendencias semanales
      trends: this.generateWeeklyTrends(days)
    };
  }
  
  generateWeeklyTrends(days: number) {
    const weeks = Math.ceil(days / 7);
    const trends = [];
    
    for (let i = 0; i < weeks; i++) {
      trends.push({
        week: i + 1,
        transactions: faker.number.int({ min: 15000, max: 30000 }),
        averageSpend: faker.number.float({ min: 200, max: 400, precision: 0.01 }),
        co2: faker.number.float({ min: 80, max: 200, precision: 0.1 })
      });
    }
    
    return trends;
  }
  
  getZonePopulation(zoneName: string) {
    const zones = {
      'San Pedro Garza García': 150000,
      'Centro de Monterrey': 200000,
      'Santa Catarina': 300000,
      'Guadalupe': 700000,
      'San Nicolás': 450000,
      'Escobedo': 400000,
      'García': 250000
    };
    
    return zones[zoneName] || 100000;
  }
  
  // Generar mapa de calor de actividad económica
  async generateEconomicHeatmap() {
    const zones = [
      'San Pedro Garza García',
      'Centro de Monterrey',
      'Santa Catarina',
      'Guadalupe',
      'San Nicolás',
      'Escobedo',
      'García'
    ];
    
    return zones.map(zone => ({
      zone,
      coordinates: this.getZoneCoordinates(zone),
      economicIndex: faker.number.int({ min: 30, max: 95 }),
      classification: this.classifyZone(faker.number.int({ min: 30, max: 95 })),
      color: this.getHeatmapColor(faker.number.int({ min: 30, max: 95 }))
    }));
  }
  
  getZoneCoordinates(zone: string) {
    const coords = {
      'San Pedro Garza García': { lat: 25.6514, lng: -100.4081 },
      'Centro de Monterrey': { lat: 25.6866, lng: -100.3161 },
      'Santa Catarina': { lat: 25.6740, lng: -100.4580 },
      'Guadalupe': { lat: 25.6767, lng: -100.2597 },
      'San Nicolás': { lat: 25.7419, lng: -100.2988 },
      'Escobedo': { lat: 25.7943, lng: -100.3221 },
      'García': { lat: 25.8097, lng: -100.5883 }
    };
    
    return coords[zone] || { lat: 25.6866, lng: -100.3161 };
  }
  
  classifyZone(index: number) {
    if (index >= 70) return { label: 'Alta', color: 'green' };
    if (index >= 50) return { label: 'Media', color: 'yellow' };
    return { label: 'Baja', color: 'red' };
  }
  
  getHeatmapColor(index: number) {
    if (index >= 70) return '#00ff00';
    if (index >= 50) return '#ffff00';
    return '#ff0000';
  }
}

export const mockUrbanData = new MockUrbanDataService();
```


***

### 3. Sistema de Onboarding con Demo Data[^1][^3]

```javascript
// components/DemoOnboarding.tsx
import React, { useState } from 'react';
import { mockMX } from '@/services/mockMXService';

const DemoOnboarding = ({ userId, onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Paso 1: Bienvenida y explicación
  const WelcomeStep = () => (
    <div className="onboarding-step">
      <h2>Bienvenido a Spendly v3.0 🚀</h2>
      <div className="demo-badge">
        <span>🎭 DEMO MODE</span>
        <p>Esta es una versión de demostración para el hackathon</p>
      </div>
      
      <div className="demo-explanation">
        <h3>¿Qué verás en esta demo?</h3>
        <ul>
          <li>✅ <strong>Datos mock simulados:</strong> Transacciones bancarias y datos urbanos de ejemplo</li>
          <li>✅ <strong>Tus datos reales:</strong> Gastos que ingreses manualmente se guardan de verdad</li>
          <li>✅ <strong>CivicPoints:</strong> Sistema de recompensas funcional</li>
          <li>✅ <strong>Dashboards:</strong> Visualizaciones de datos urbanos agregados</li>
        </ul>
      </div>
      
      <button onClick={() => setStep(2)}>
        Comenzar Demo →
      </button>
    </div>
  );
  
  // Paso 2: "Conectar" banco (mock)
  const BankConnectionStep = () => {
    const [selectedBank, setSelectedBank] = useState(null);
    
    const mockBanks = [
      { id: 'bbva', name: 'BBVA México', logo: '/logos/bbva.png' },
      { id: 'banorte', name: 'Banorte', logo: '/logos/banorte.png' },
      { id: 'hsbc', name: 'HSBC', logo: '/logos/hsbc.png' },
      { id: 'scotiabank', name: 'Scotiabank', logo: '/logos/scotiabank.png' },
      { id: 'nu', name: 'Nu México', logo: '/logos/nu.png' }
    ];
    
    const handleConnect = async () => {
      setLoading(true);
      
      // Simular proceso de conexión
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generar cuentas y transacciones mock
      const accounts = await mockMX.generateDemoUser(userId);
      
      for (const account of accounts) {
        const transactions = await mockMX.generateMockTransactions(account.guid, 30);
        await saveTransactions(userId, account.guid, transactions);
      }
      
      setLoading(false);
      setStep(3);
    };
    
    return (
      <div className="bank-connection-step">
        <div className="demo-badge">🎭 Conexión Simulada</div>
        
        <h2>Conecta tu banco</h2>
        <p>Selecciona cualquier banco para generar datos de demostración</p>
        
        <div className="bank-grid">
          {mockBanks.map(bank => (
            <div 
              key={bank.id}
              className={`bank-card ${selectedBank === bank.id ? 'selected' : ''}`}
              onClick={() => setSelectedBank(bank.id)}
            >
              <img src={bank.logo} alt={bank.name} />
              <p>{bank.name}</p>
            </div>
          ))}
        </div>
        
        {selectedBank && (
          <button 
            onClick={handleConnect}
            disabled={loading}
          >
            {loading ? '🔄 Conectando...' : 'Conectar Banco'}
          </button>
        )}
        
        <div className="info-box">
          <p>💡 <strong>Nota:</strong> Esta conexión es simulada. Se generarán 30 días de transacciones de ejemplo realistas.</p>
        </div>
      </div>
    );
  };
  
  // Paso 3: Configurar consentimientos
  const ConsentStep = () => {
    const [consents, setConsents] = useState({
      mobility: false,
      commercial: false,
      energy: false
    });
    
    const handleComplete = async () => {
      // Guardar consentimientos
      await saveUserConsents(userId, consents);
      
      // Dar puntos de bienvenida
      await awardCivicPoints(userId, 100, 'welcome_bonus');
      
      onComplete();
    };
    
    return (
      <div className="consent-step">
        <h2>Activa la Economía de Datos 💎</h2>
        <p>Elige qué datos (anónimos) quieres compartir para ganar CivicPoints</p>
        
        <div className="consent-cards">
          <div className="consent-card">
            <input 
              type="checkbox"
              checked={consents.mobility}
              onChange={(e) => setConsents({...consents, mobility: e.target.checked})}
            />
            <div>
              <h4>🚗 Datos de Movilidad</h4>
              <p>Compartir patrones de transporte (anónimos)</p>
              <span className="points">+10 puntos por transacción</span>
            </div>
          </div>
          
          <div className="consent-card">
            <input 
              type="checkbox"
              checked={consents.commercial}
              onChange={(e) => setConsents({...consents, commercial: e.target.checked})}
            />
            <div>
              <h4>🛒 Datos Comerciales</h4>
              <p>Compartir categorías de gasto (sin montos exactos)</p>
              <span className="points">+5 puntos por transacción</span>
            </div>
          </div>
          
          <div className="consent-card">
            <input 
              type="checkbox"
              checked={consents.energy}
              onChange={(e) => setConsents({...consents, energy: e.target.checked})}
            />
            <div>
              <h4>💡 Datos de Energía</h4>
              <p>Compartir consumo energético agregado</p>
              <span className="points">+15 puntos por reporte</span>
            </div>
          </div>
        </div>
        
        <div className="info-box">
          <h4>🔒 Tu privacidad está protegida</h4>
          <ul>
            <li>Todos los datos se anonimizan antes de compartirse</li>
            <li>Solo se comparten datos agregados y en cuadrículas de 500m</li>
            <li>Puedes desactivar esto en cualquier momento</li>
          </ul>
        </div>
        
        <button onClick={handleComplete}>
          Completar Setup →
        </button>
      </div>
    );
  };
  
  return (
    <div className="demo-onboarding">
      {step === 1 && <WelcomeStep />}
      {step === 2 && <BankConnectionStep />}
      {step === 3 && <ConsentStep />}
    </div>
  );
};

export default DemoOnboarding;
```


***

### 4. Componente de Entrada Manual (Datos Reales)[^4]

```javascript
// components/ManualEntryForm.tsx
import React, { useState } from 'react';
import { saveUserTransaction } from '@/services/userDataService';

const ManualEntryForm = ({ userId }) => {
  const [formData, setFormData] = useState({
    amount: '',
    merchant: '',
    category: '',
    subcategory: '',
    date: new Date().toISOString().split('T')[^0],
    notes: ''
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Estos datos SÍ son reales del usuario
    const transaction = {
      id: generateUUID(),
      userId,
      amount: parseFloat(formData.amount),
      merchant: formData.merchant,
      category: formData.category,
      subcategory: formData.subcategory,
      date: new Date(formData.date),
      notes: formData.notes,
      co2Impact: calculateRealCO2(formData.category, formData.amount),
      source: 'manual_entry',
      isMock: false, // ¡Datos reales!
      createdAt: new Date()
    };
    
    // Guardar en Supabase o tu DB
    await saveUserTransaction(transaction);
    
    // Si el usuario consintió, agregar a pool urbano
    if (await hasConsent(userId, 'commercial')) {
      await addToUrbanDataPool(userId, transaction);
      await awardCivicPoints(userId, 5, 'commercial_share');
    }
    
    // Reset form
    setFormData({...formData, amount: '', merchant: '', notes: ''});
    
    // Notificar éxito
    toast.success('💰 Gasto registrado correctamente');
  };
  
  return (
    <form onSubmit={handleSubmit} className="manual-entry-form">
      <div className="form-badge">✍️ Entrada Manual (Datos Reales)</div>
      
      <div className="form-group">
        <label>Monto (MXN)</label>
        <input 
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({...formData, amount: e.target.value})}
          placeholder="125.50"
          required
        />
      </div>
      
      <div className="form-group">
        <label>¿Dónde?</label>
        <input 
          type="text"
          value={formData.merchant}
          onChange={(e) => setFormData({...formData, merchant: e.target.value})}
          placeholder="Ej: Oxxo, Uber, Netflix..."
          required
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>Categoría</label>
          <select 
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
            required
          >
            <option value="">Selecciona...</option>
            <option value="Alimentación">Alimentación</option>
            <option value="Transporte">Transporte</option>
            <option value="Entretenimiento">Entretenimiento</option>
            <option value="Compras">Compras</option>
            <option value="Servicios">Servicios</option>
            <option value="Salud">Salud</option>
            <option value="Educación">Educación</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Fecha</label>
          <input 
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            required
          />
        </div>
      </div>
      
      <div className="form-group">
        <label>Notas (opcional)</label>
        <textarea 
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          placeholder="Comida con amigos..."
        />
      </div>
      
      <button type="submit" className="submit-btn">
        Registrar Gasto
      </button>
    </form>
  );
};
```


***

### 5. Dashboard con Indicadores Mock vs Real[^3]

```javascript
// components/DashboardView.tsx
const DashboardView = ({ userId, userTransactions }) => {
  const [viewMode, setViewMode] = useState('personal'); // 'personal' | 'urban'
  
  // Separar datos mock de datos reales
  const mockTransactions = userTransactions.filter(t => t.isMock);
  const realTransactions = userTransactions.filter(t => !t.isMock);
  
  return (
    <div className="dashboard">
      {/* Indicador de modo demo */}
      <div className="demo-indicator">
        <span>🎭 DEMO MODE</span>
        <div className="data-badges">
          <span className="badge mock">{mockTransactions.length} Transacciones Mock</span>
          <span className="badge real">{realTransactions.length} Transacciones Reales</span>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="view-tabs">
        <button 
          className={viewMode === 'personal' ? 'active' : ''}
          onClick={() => setViewMode('personal')}
        >
          💰 Mi Dashboard
        </button>
        <button 
          className={viewMode === 'urban' ? 'active' : ''}
          onClick={() => setViewMode('urban')}
        >
          🏙️ Datos Urbanos
        </button>
      </div>
      
      {viewMode === 'personal' ? (
        <PersonalDashboard 
          mockData={mockTransactions}
          realData={realTransactions}
        />
      ) : (
        <UrbanDashboard 
          zone="San Pedro Garza García"
          mockUrbanData={await mockUrbanData.generateZoneData('San Pedro')}
        />
      )}
    </div>
  );
};

const UrbanDashboard = ({ zone, mockUrbanData }) => {
  return (
    <div className="urban-dashboard">
      <div className="demo-badge">
        📊 Datos Urbanos Agregados (Mock)
      </div>
      
      <h2>Zona: {zone}</h2>
      
      {/* Indicadores clave */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <h4>Índice Económico</h4>
          <div className="kpi-value">
            {mockUrbanData.economicActivityIndex}/100
          </div>
          <span className="trend">+8% vs mes anterior</span>
        </div>
        
        <div className="kpi-card">
          <h4>Usuarios Activos</h4>
          <div className="kpi-value">
            {mockUrbanData.activeUsers.toLocaleString()}
          </div>
          <span className="info">Compartiendo datos</span>
        </div>
        
        <div className="kpi-card">
          <h4>Transacciones/Mes</h4>
          <div className="kpi-value">
            {mockUrbanData.commercial.totalTransactions.toLocaleString()}
          </div>
        </div>
        
        <div className="kpi-card">
          <h4>CO₂ Evitado</h4>
          <div className="kpi-value">
            {mockUrbanData.mobility.totalCO2.toFixed(0)} ton
          </div>
          <span className="eco">🌱 vs auto propio</span>
        </div>
      </div>
      
      {/* Gráficas */}
      <div className="charts-section">
        <MobilityChart data={mockUrbanData.mobility} />
        <CommercialActivityChart data={mockUrbanData.commercial} />
        <TrendsChart data={mockUrbanData.trends} />
      </div>
      
      {/* Mapa de calor */}
      <HeatMapComponent data={mockUrbanData.heatmap} />
    </div>
  );
};
```


***

## Checklist de Implementación Hackathon

### ✅ Fase Pre-Hackathon (Preparación)

```
□ Configurar proyecto Next.js + Supabase
□ Instalar faker.js para datos mock
□ Crear mockMXService completo
□ Crear mockUrbanDataService completo
□ Diseñar componentes de UI principales
□ Preparar logos de bancos mock
□ Crear seed data de ejemplo
```


### ✅ Durante Hackathon (32 horas)

**Horas 1-8: Core Funcional**

```
□ Sistema de autenticación (Supabase Auth)
□ Onboarding con demo data
□ Dashboard personal básico
□ Entrada manual de gastos (datos reales)
```

**Horas 9-16: Features Clave**

```
□ Sistema CivicPoints funcional
□ Catálogo de beneficios canjeables
□ Dashboard urbano con datos mock
□ Gráficas y visualizaciones
```

**Horas 17-24: Polish + Extras**

```
□ WhatsApp bot (si da tiempo)
□ Animaciones y transiciones
□ Modo oscuro/claro
□ Responsive mobile
```

**Horas 25-32: Demo + Pitch**

```
□ Video demo de 2 minutos
□ Slides de pitch (7 min)
□ Deploy a Vercel
□ Testing de flujo completo
```


***

## Estructura de Archivos Sugerida

```
spendly-v3/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/
│   │   ├── personal/
│   │   ├── urban/
│   │   └── benefits/
│   └── onboarding/
├── components/
│   ├── DemoOnboarding.tsx
│   ├── ManualEntryForm.tsx
│   ├── DashboardView.tsx
│   ├── UrbanDashboard.tsx
│   ├── CivicPointsWidget.tsx
│   └── BenefitsCatalog.tsx
├── services/
│   ├── mockMXService.ts          ← Datos MOCK
│   ├── mockUrbanDataService.ts   ← Datos MOCK
│   ├── userDataService.ts         ← Datos REALES
│   └── civicPointsService.ts
├── lib/
│   ├── supabase.ts
│   └── utils.ts
└── public/
    └── logos/
        ├── bbva.png
        ├── banorte.png
        └── nu.png
```


***

## Elementos Visuales Clave para Demo

### 1. Badge "Demo Mode" Visible

```jsx
<div className="demo-mode-badge">
  <span>🎭 DEMO MODE - Hackathon Version</span>
  <div className="data-status">
    <span className="mock">Datos Mock: MX Banking, Urban Data</span>
    <span className="real">Datos Reales: Entradas Manuales</span>
  </div>
</div>
```


### 2. Indicadores de Fuente de Datos

```jsx
// En cada transacción
{transaction.isMock ? (
  <span className="badge mock-badge">🎭 Demo</span>
) : (
  <span className="badge real-badge">✅ Real</span>
)}
```


### 3. Dashboard de Jueces

```jsx
// Vista especial para mostrar a jueces
<JudgeDashboard>
  <h2>Vista del Juez - Capacidades v3.0</h2>
  
  <section>
    <h3>1. Datos Mock (Simulados para Demo)</h3>
    <ul>
      <li>30 días de transacciones bancarias realistas</li>
      <li>Datos urbanos agregados de 7 zonas de MTY</li>
      <li>Estadísticas de movilidad y actividad comercial</li>
    </ul>
  </section>
  
  <section>
    <h3>2. Datos Reales (Funcionalidad Completa)</h3>
    <ul>
      <li>Entrada manual de gastos → Base de datos real</li>
      <li>Sistema CivicPoints → Acumulación y canje real</li>
      <li>Consentimientos → Stored en DB</li>
    </ul>
  </section>
  
  <section>
    <h3>3. Escalabilidad Post-Hackathon</h3>
    <ul>
      <li>Reemplazar mockMXService con MX API real</li>
      <li>Conectar sensores IoT reales</li>
      <li>Integrar con gobiernos y empresas</li>
    </ul>
  </section>
</JudgeDashboard>
```


***

Esta arquitectura te permite tener una **demo completamente funcional** para el hackathon sin necesidad de APIs reales, pero con la estructura lista para escalar a producción simplemente reemplazando los servicios mock por integraciones reales.[^2][^4][^1][^3]
<span style="display:none">[^10][^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^5][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://www.postman.com/templates/collections/generate-fake-test-data/

[^2]: http://api.nessieisreal.com

[^3]: https://fakerjs.dev

[^4]: v2.md

[^5]: https://www.youtube.com/watch?v=1q2oxv1oOiU

[^6]: https://www.youtube.com/watch?v=R0OO9IyTdjM

[^7]: https://hackathon.deepintomlf.ai/competitions/38

[^8]: https://blog.fundingsocieties.com/financial-solutions-from-generative-ai-2023-hackathon-delivers/

[^9]: https://www.youtube.com/watch?v=8KNYNfCBrIw

[^10]: https://ekata.com/solutions/transaction-risk-api/

[^11]: https://www.youtube.com/watch?v=3csC1gXtI5E

[^12]: https://eccles.utah.edu/programs/undergraduate/generative-ai-hackathon/

[^13]: https://www.adempierebr.com/Create_a_New_Demo_in_Seed

[^14]: https://developer.payments.jpmorgan.com/docs/treasury/global-payments/capabilities/global-payments/testing

[^15]: https://www.youtube.com/watch?v=6t6lNTmp5zo

[^16]: https://mockoon.com/mock-samples/category/payment/

[^17]: https://www.accountingseed.com/5-minute-demo/

[^18]: https://beeceptor.com/mock-server/explore/

[^19]: https://www.accountingseed.com/resources/webinars/live-demo/

[^20]: https://www.cantaloupe.com/video/expert-insights-how-to-use-seed-analytics-like-a-pro/

[^21]: https://docs.rapidapi.com/docs/creating-fake-data-in-tests

