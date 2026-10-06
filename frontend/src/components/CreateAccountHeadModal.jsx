// frontend/src/components/CreateAccountHeadModal.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  getFirmMasterAccounts, 
  saveMasterAccount, 
  deleteMasterAccount, 
  getIndustrySuggestions 
} from '../utils/accountMasterEngine.js';

const round2 = (num) => Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;

export default function CreateAccountHeadModal({ firm, selectedFY, isOpen = true, onClose }) {
  const firmId = firm?.id || firm?.firm_id || localStorage.getItem('app_active_firm_id') || 'FIRM-001';
  const firmCat = String(firm?.category || firm?.businessCategory || firm?.firmType || 'BRICK_KILN').toUpperCase();

  const [accounts, setAccounts] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Form States
  const [selectedCatId, setSelectedCatId] = useState('DEBTOR');
  const [accountName, setAccountName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [balanceDirection, setBalanceDirection] = useState('LE_NA_HAI');

  // Autocomplete / Search States
  const [showDropdownSuggestions, setShowDropdownSuggestions] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  
  const dropdownRef = useRef(null);

  // Dynamic Multi-Industry Intent Cards Configuration
  const businessCategories = useMemo(() => {
    const isTransport = firmCat.includes('TRANSPORT') || firmCat.includes('LOGISTIC');
    const isTrading = firmCat.includes('TRADING') || firmCat.includes('RETAIL') || firmCat.includes('SHOP');
    const isMfg = firmCat.includes('MANUFACTURING') || firmCat.includes('FACTORY');

    return [
      {
        id: 'DEBTOR',
        title: 'Customer / Grahak',
        subtitle: isTransport ? 'पार्टी / फ्रेट बिलिंग ग्राहक' : isTrading ? 'दुकानदार / रिटेल व होलसेल ग्राहक' : 'ईंट व माल खरीदने वाला ग्राहक',
        icon: '🛒',
        color: '#0284c7',
        primaryType: 'ASSETS',
        subGroup: 'Sundry Debtors (Customer / देनदार)',
        defaultBalanceType: 'Dr'
      },
      {
        id: 'CREDITOR',
        title: 'Supplier / Vyapari',
        subtitle: isTransport ? 'डीजल पम्प, टायर व पार्ट्स सप्लायर' : isTrading ? 'होलसेलर व एजेंसी माल सप्लायर' : 'कोयला, मिट्टी, सीमेंट सप्लायर',
        icon: '🚚',
        color: '#b45309',
        primaryType: 'LIABILITIES',
        subGroup: 'Sundry Creditors (Suppliers / लेनदार)',
        defaultBalanceType: 'Cr'
      },
      {
        id: 'THEKEDAR',
        title: isTransport ? 'Driver & Staff' : isTrading ? 'Staff / Salesman' : 'Thekedar / Mazdoor',
        subtitle: isTransport ? 'गाड़ी चालक व हेल्पर वेतन/भाड़ा' : isTrading ? 'दुकान सेल्समैन वेतन व भत्ता' : 'पथाई, भराई, निकासी व लेबर ठेका',
        icon: '👷',
        color: '#166534',
        primaryType: 'LIABILITIES',
        subGroup: 'Outstanding Expenses Payable',
        defaultBalanceType: 'Cr'
      },
      {
        id: 'BANK_CASH',
        title: 'Bank & Cash',
        subtitle: 'SBI, PNB, Cash in Hand, UPI QR',
        icon: '🏦',
        color: '#0f766e',
        primaryType: 'ASSETS',
        subGroup: 'Cash in Hand (रोकड़)',
        defaultBalanceType: 'Dr'
      },
      {
        id: 'ASSET',
        title: isTransport ? 'Fleet & Property' : 'Machine & Property',
        subtitle: isTransport ? 'ट्रक, ट्रेलर, ऑफिस व जमीन संपत्ति' : isTrading ? 'दुकान शोरूम, फर्नीचर व कंप्यूटर' : 'ट्रैक्टर, जमीन, चिमनी, झोपड़ी संपत्ति',
        icon: isTransport ? '🚛' : isTrading ? '🏢' : '🚜',
        color: '#4338ca',
        primaryType: 'ASSETS',
        subGroup: 'Fixed Assets (Machinery / Vehicles / Land / Building)',
        defaultBalanceType: 'Dr'
      },
      {
        id: 'EXPENSE',
        title: 'Kharcha (Expense)',
        subtitle: isTransport ? 'टोल टैक्स, डीजल, आरटीओ खर्च' : isTrading ? 'दुकान किराया, बिजली, भाड़ा खर्च' : 'डीजल, मरम्मत, फैक्ट्री खर्च',
        icon: '📉',
        color: '#be123c',
        primaryType: 'EXPENSES',
        subGroup: isTrading ? 'Administrative & Office Expenses' : 'Operating Fuel Costs (Tractor / Generator Diesel)',
        defaultBalanceType: 'Dr'
      }
    ];
  }, [firmCat]);

  const activeCategory = useMemo(() => {
    return businessCategories.find(c => c.id === selectedCatId) || businessCategories[0];
  }, [selectedCatId, businessCategories]);

  // Industry-Aware Suggestions List
  const industrySuggestions = useMemo(() => {
    return getIndustrySuggestions(firmCat);
  }, [firmCat]);

  const loadAccounts = () => {
    const data = getFirmMasterAccounts(firmId);
    setAccounts(data);
  };

  useEffect(() => {
    loadAccounts();
    window.addEventListener('app_storage_updated', loadAccounts);
    window.addEventListener('app_state_updated', loadAccounts);
    return () => {
      window.removeEventListener('app_storage_updated', loadAccounts);
      window.removeEventListener('app_state_updated', loadAccounts);
    };
  }, [firmId]);

  useEffect(() => {
    if (!editingId) {
      if (activeCategory.defaultBalanceType === 'Dr') {
        setBalanceDirection('LE_NA_HAI');
      } else {
        setBalanceDirection('DE_NA_HAI');
      }
    }
  }, [selectedCatId, activeCategory, editingId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdownSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = useMemo(() => {
    const q = accountName.trim().toLowerCase();
    if (!q) return [];
    return industrySuggestions.filter(s => 
      s.name.toLowerCase().includes(q) && s.name.toLowerCase() !== q
    ).slice(0, 5);
  }, [accountName, industrySuggestions]);

  const handleApplySuggestion = (sug) => {
    setAccountName(sug.name);
    setSelectedCatId(sug.
