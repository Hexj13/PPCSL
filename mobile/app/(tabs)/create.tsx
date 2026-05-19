import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { mobileBrandsApi } from '@/api/brands';
import { mobileCitiesApi } from '@/api/cities';
import { mobileListingsApi } from '@/api/listings';
import { mobileTiresApi } from '@/api/tires';
import type { TireBrand, TireModel } from '@/api/tires';
import { mobileUploadApi } from '@/api/upload';
import { useAuth } from '@/auth/AuthContext';
import { AuthRequiredScreen } from '@/components/auth/AuthRequiredScreen';
import { MobileAppShell } from '@/components/layout/MobileAppShell';
import { MobileBottomSheet } from '@/components/MobileBottomSheet';
import { Text } from '@/components/Themed';
import { useI18n } from '@/i18n/I18nContext';
import type { Brand, City, Listing, VehicleModel } from '@/synced/api-types';
import {
  BODY_TYPES_BY_VEHICLE_TYPE,
  DriveType,
  FuelType,
  TransmissionType,
  VEHICLE_TYPE_BY_BODY_TYPE,
  isValidTireAspectRatio,
  isValidTireDiameterInch,
  isValidTireWidthMm,
  normalizeTireDiameterInch,
  parseStrictUnsignedIntString,
  TIRE_ASPECT_RATIO_MAX,
  TIRE_ASPECT_RATIO_MIN,
  TIRE_ASPECT_RATIO_STEP,
  TIRE_DIAMETER_INCH_MAX,
  TIRE_DIAMETER_INCH_MIN,
  TIRE_DIAMETER_INCH_STEP,
  TIRE_LISTING_QUANTITY_MAX,
  TIRE_LISTING_QUANTITY_MIN,
  TIRE_WIDTH_MM_MAX,
  TIRE_WIDTH_MM_MIN,
  TIRE_WIDTH_MM_STEP,
} from '@/synced/constants';
import type { BodyType } from '@/synced/types';
import { TIRE_TREAD_VALUES, type TireTread } from '@/synced/tire-tread';
import colors from '@/theme/synced/colors';

type LocalImage = { uri: string; uploadedUrl?: string };
type ListingMode = 'vehicle' | 'tire';
type VehicleKind = 'car' | 'truck' | 'moto';
type TireCondition = 'new' | 'used' | 'retreaded';

const sheetListMaxHeight = Dimensions.get('window').height * 0.48;
const TIRE_LOAD_INDEX_MIN = 0;
const TIRE_LOAD_INDEX_MAX = 279;
const TIRE_SPEED_INDEX_LETTERS = ['Q', 'R', 'S', 'T', 'H', 'V', 'W', 'Y'] as const;
const TIRE_CONDITIONS: TireCondition[] = ['new', 'used', 'retreaded'];

function parseTireDiameterInch(raw: string): number | null {
  const n = parseFloat(raw.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  const scaled = normalizeTireDiameterInch(n);
  if (Math.abs(scaled - n) > 1e-6 || !isValidTireDiameterInch(scaled)) return null;
  return scaled;
}

type Fuel = (typeof FuelType)[keyof typeof FuelType];
type Transmission = (typeof TransmissionType)[keyof typeof TransmissionType];
type Drive = (typeof DriveType)[keyof typeof DriveType];

const FUEL_VALUES = Object.values(FuelType) as Fuel[];
const TRANSMISSION_VALUES = Object.values(TransmissionType) as Transmission[];
const DRIVE_VALUES = Object.values(DriveType) as Drive[];

export default function CreateListingScreen() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  const [listingMode, setListingMode] = useState<ListingMode>('vehicle');

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [vehicleKind, setVehicleKind] = useState<VehicleKind>('car');
  const [cities, setCities] = useState<City[]>([]);
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bodyType, setBodyType] = useState<string>(BODY_TYPES_BY_VEHICLE_TYPE.car[0]);
  const [fuel, setFuel] = useState<Fuel>(FuelType.Petrol);
  const [transmission, setTransmission] = useState<Transmission>(TransmissionType.Manual);
  const [driveType, setDriveType] = useState<Drive>(DriveType.FWD);
  const [engineDisplStr, setEngineDisplStr] = useState('');

  const [tireBrands, setTireBrands] = useState<TireBrand[]>([]);
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [tireVehicleType, setTireVehicleType] = useState<VehicleKind>('car');
  const [tireBrandId, setTireBrandId] = useState('');
  const [tireModelId, setTireModelId] = useState('');
  const [tireSeason, setTireSeason] = useState<TireTread>('summer');
  const [tireCondition, setTireCondition] = useState<TireCondition>('used');
  const [widthMmStr, setWidthMmStr] = useState('');
  const [aspectRatioStr, setAspectRatioStr] = useState('');
  const [diameterStr, setDiameterStr] = useState('');
  const [quantityStr, setQuantityStr] = useState('4');
  const [loadIndexStr, setLoadIndexStr] = useState('');
  const [speedIndexStr, setSpeedIndexStr] = useState('');
  const [studded, setStudded] = useState(false);
  const [runFlat, setRunFlat] = useState(false);
  const [reinforcedXl, setReinforcedXl] = useState(false);
  const [spareDonut, setSpareDonut] = useState(false);
  const [tubeless, setTubeless] = useState(false);
  const [acoustic, setAcoustic] = useState(false);

  const [images, setImages] = useState<LocalImage[]>([]);
  const [hidePlates, setHidePlates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [brandSheet, setBrandSheet] = useState(false);
  const [modelSheet, setModelSheet] = useState(false);
  const [bodyTypeSheet, setBodyTypeSheet] = useState(false);
  const [citySheet, setCitySheet] = useState(false);
  const [fuelSheet, setFuelSheet] = useState(false);
  const [transmissionSheet, setTransmissionSheet] = useState(false);
  const [driveSheet, setDriveSheet] = useState(false);
  const [tireBrandSheet, setTireBrandSheet] = useState(false);
  const [tireModelSheet, setTireModelSheet] = useState(false);
  const [tireSeasonSheet, setTireSeasonSheet] = useState(false);
  const [tireConditionSheet, setTireConditionSheet] = useState(false);
  const [tireQuantitySheet, setTireQuantitySheet] = useState(false);
  const [tireSpeedSheet, setTireSpeedSheet] = useState(false);
  const [brandQuery, setBrandQuery] = useState('');
  const [tireBrandQuery, setTireBrandQuery] = useState('');

  const bodyTypes = BODY_TYPES_BY_VEHICLE_TYPE[vehicleKind];

  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, brandQuery]);

  const filteredTireBrands = useMemo(() => {
    const q = tireBrandQuery.trim().toLowerCase();
    if (!q) return tireBrands;
    return tireBrands.filter((b) => b.name.toLowerCase().includes(q));
  }, [tireBrands, tireBrandQuery]);

  const quantityOptions = useMemo(
    () =>
      Array.from({ length: TIRE_LISTING_QUANTITY_MAX - TIRE_LISTING_QUANTITY_MIN + 1 }, (_, i) =>
        String(TIRE_LISTING_QUANTITY_MIN + i),
      ),
    [],
  );

  useEffect(() => {
    if (tireVehicleType !== 'car' && runFlat) setRunFlat(false);
  }, [tireVehicleType, runFlat]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await mobileCitiesApi.getAll();
      if (!cancelled) setCities(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await mobileTiresApi.getBrands();
      if (!cancelled) setTireBrands(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (listingMode !== 'vehicle') return;
    let cancelled = false;
    (async () => {
      const { data } = await mobileBrandsApi.getAll(vehicleKind);
      if (!cancelled) setBrands(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [listingMode, vehicleKind]);

  useEffect(() => {
    if (!brandId || listingMode !== 'vehicle') {
      setModels([]);
      setModelId('');
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await mobileBrandsApi.getModels(brandId, vehicleKind);
      if (!cancelled) setModels(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId, vehicleKind, listingMode]);

  useEffect(() => {
    if (!tireBrandId) {
      setTireModels([]);
      setTireModelId('');
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await mobileTiresApi.getModelsByBrand(tireBrandId);
      if (!cancelled) setTireModels(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [tireBrandId]);

  useEffect(() => {
    if (listingMode !== 'vehicle') return;
    if (!bodyTypes.includes(bodyType as (typeof bodyTypes)[number])) {
      setBodyType(bodyTypes[0]);
    }
  }, [listingMode, bodyTypes, bodyType]);

  const loadEdit = useCallback(
    async (id: string) => {
      const { data } = await mobileListingsApi.getOne(id);
      const l = data as Listing;
      const isTire = l.category === 'tire' || (l.tire && !l.vehicle);
      setTitle(l.title);
      setDescription(l.description ?? '');
      setPrice(l.price != null ? String(l.price) : '');
      setCity(l.city);
      if (isTire && l.tire) {
        setListingMode('tire');
        const ti = l.tire;
        setTireVehicleType(ti.tire_vehicle_type);
        setTireBrandId(ti.brand_id);
        setTireModelId(ti.model_id ?? '');
        setTireSeason(ti.season);
        setTireCondition(ti.condition);
        setWidthMmStr(String(ti.width_mm));
        setAspectRatioStr(String(ti.aspect_ratio));
        setDiameterStr(String(ti.diameter_inch));
        setQuantityStr(String(ti.quantity));
        setLoadIndexStr(ti.load_index ?? '');
        setSpeedIndexStr(ti.speed_index ?? '');
        setStudded(Boolean(ti.studded));
        setRunFlat(Boolean(ti.run_flat));
        setReinforcedXl(Boolean(ti.reinforced_xl));
        setSpareDonut(Boolean(ti.spare_donut));
        setTubeless(Boolean(ti.tubeless));
        setAcoustic(Boolean(ti.acoustic));
      } else {
        setListingMode('vehicle');
        if (l.vehicle) {
          const vk = VEHICLE_TYPE_BY_BODY_TYPE[l.vehicle.body_type] ?? 'car';
          setVehicleKind(vk);
          setBrandId(l.vehicle.brand_id);
          setModelId(l.vehicle.model_id);
          setYear(String(l.vehicle.year));
          setMileage(l.vehicle.mileage_km != null ? String(l.vehicle.mileage_km) : '');
          setBodyType(l.vehicle.body_type);
          if (l.vehicle.fuel) setFuel(l.vehicle.fuel as Fuel);
          if (l.vehicle.transmission) setTransmission(l.vehicle.transmission as Transmission);
          if (l.vehicle.drive_type) setDriveType(l.vehicle.drive_type as Drive);
          setEngineDisplStr(
            l.vehicle.engine_displ_l != null && l.vehicle.engine_displ_l !== undefined
              ? String(l.vehicle.engine_displ_l)
              : '',
          );
        }
      }
      if (l.images?.length) {
        setImages(l.images.map((url) => ({ uri: url, uploadedUrl: url })));
      }
    },
    [],
  );

  useEffect(() => {
    if (!editId || authLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        await loadEdit(editId);
      } catch {
        if (!cancelled) Alert.alert(t('common.error'), t('common.loading'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, user, authLoading, loadEdit, t]);

  function switchListingMode(next: ListingMode) {
    if (editId) return;
    setListingMode(next);
  }

  function switchVehicleKind(next: VehicleKind) {
    if (next === vehicleKind) return;
    setVehicleKind(next);
    setBrandId('');
    setModelId('');
    setBodyType(BODY_TYPES_BY_VEHICLE_TYPE[next][0]);
  }

  async function pickGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('common.error'), t('mobile.permissions.photos'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (res.canceled) return;
    setImages((prev) => [...prev, ...res.assets.map((a) => ({ uri: a.uri }))]);
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('common.error'), t('mobile.permissions.camera'));
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (res.canceled) return;
    const a = res.assets[0];
    if (a) setImages((prev) => [...prev, { uri: a.uri }]);
  }

  async function uploadAllImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const img of images) {
      if (img.uploadedUrl) {
        urls.push(img.uploadedUrl);
        continue;
      }
      const manipulated = await ImageManipulator.manipulateAsync(
        img.uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );
      const formData = new FormData();
      formData.append('file', {
        uri: manipulated.uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);
      const { data } = await mobileUploadApi.uploadImage(formData, hidePlates);
      urls.push(data.url);
    }
    return urls;
  }

  function validateTirePayload(): boolean {
    if (!tireBrandId) {
      Alert.alert(t('common.error'), t('listings.brandRequired'));
      return false;
    }
    if (!widthMmStr.trim()) {
      Alert.alert(t('common.error'), t('listings.tireForm.widthRequired'));
      return false;
    }
    const w = parseStrictUnsignedIntString(widthMmStr);
    if (w === null || !isValidTireWidthMm(w)) {
      Alert.alert(
        t('common.error'),
        t('listings.tireForm.widthInvalid', {
          min: TIRE_WIDTH_MM_MIN,
          max: TIRE_WIDTH_MM_MAX,
          step: TIRE_WIDTH_MM_STEP,
        }),
      );
      return false;
    }
    if (!aspectRatioStr.trim()) {
      Alert.alert(t('common.error'), t('listings.tireForm.profileRequired'));
      return false;
    }
    const ar = parseStrictUnsignedIntString(aspectRatioStr);
    if (ar === null || !isValidTireAspectRatio(ar)) {
      Alert.alert(
        t('common.error'),
        t('listings.tireForm.profileInvalid', {
          min: TIRE_ASPECT_RATIO_MIN,
          max: TIRE_ASPECT_RATIO_MAX,
          step: TIRE_ASPECT_RATIO_STEP,
        }),
      );
      return false;
    }
    if (!diameterStr.trim()) {
      Alert.alert(t('common.error'), t('listings.tireForm.diameterRequired'));
      return false;
    }
    const d = parseTireDiameterInch(diameterStr);
    if (d === null) {
      Alert.alert(
        t('common.error'),
        t('listings.tireForm.diameterInvalid', {
          min: TIRE_DIAMETER_INCH_MIN,
          max: TIRE_DIAMETER_INCH_MAX,
          step: TIRE_DIAMETER_INCH_STEP,
        }),
      );
      return false;
    }
    if (!quantityStr.trim()) {
      Alert.alert(t('common.error'), t('listings.tireForm.quantityRequired'));
      return false;
    }
    const q = parseInt(quantityStr, 10);
    if (
      !Number.isFinite(q) ||
      !Number.isInteger(q) ||
      q < TIRE_LISTING_QUANTITY_MIN ||
      q > TIRE_LISTING_QUANTITY_MAX
    ) {
      Alert.alert(
        t('common.error'),
        t('listings.tireForm.quantityInvalid', {
          min: TIRE_LISTING_QUANTITY_MIN,
          max: TIRE_LISTING_QUANTITY_MAX,
        }),
      );
      return false;
    }
    if (loadIndexStr.trim()) {
      const li = parseInt(loadIndexStr.trim(), 10);
      if (
        !/^\d+$/.test(loadIndexStr.trim()) ||
        !Number.isFinite(li) ||
        li < TIRE_LOAD_INDEX_MIN ||
        li > TIRE_LOAD_INDEX_MAX
      ) {
        Alert.alert(
          t('common.error'),
          t('listings.tireForm.loadIndexInvalid', {
            min: TIRE_LOAD_INDEX_MIN,
            max: TIRE_LOAD_INDEX_MAX,
          }),
        );
        return false;
      }
    }
    const si = speedIndexStr.trim().toUpperCase();
    if (si && !TIRE_SPEED_INDEX_LETTERS.includes(si as (typeof TIRE_SPEED_INDEX_LETTERS)[number])) {
      Alert.alert(t('common.error'), t('common.error'));
      return false;
    }
    if (studded && tireSeason !== 'winter') {
      Alert.alert(t('common.error'), t('listings.tireForm.studdedOnlyWinter'));
      return false;
    }
    if (runFlat && tireVehicleType !== 'car') {
      Alert.alert(t('common.error'), t('listings.tireForm.runFlatOnlyCar'));
      return false;
    }
    if (images.length < 1) {
      Alert.alert(t('common.error'), t('listings.tireForm.imagesMinRequired'));
      return false;
    }
    if (!price.trim() || !Number.isFinite(Number(price)) || Number(price) < 0) {
      Alert.alert(t('common.error'), t('listings.priceRequired'));
      return false;
    }
    if (!city.trim()) {
      Alert.alert(t('common.error'), t('listings.cityRequired'));
      return false;
    }
    return true;
  }

  function validateVehiclePayload(): boolean {
    if (images.length < 2) {
      Alert.alert(t('common.error'), t('listings.imagesMinRequired'));
      return false;
    }
    if (!title.trim()) {
      Alert.alert(t('common.error'), t('common.requiredAsterisk'));
      return false;
    }
    if (!brandId || !modelId || !year || !price || !city) {
      Alert.alert(t('common.error'), t('common.requiredAsterisk'));
      return false;
    }
    const y = Number(year);
    const maxY = new Date().getFullYear() + 1;
    if (!Number.isInteger(y) || y < 1900 || y > maxY) {
      Alert.alert(t('common.error'), t('listings.yearTitle'));
      return false;
    }
    return true;
  }

  async function onSubmit() {
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    if (listingMode === 'tire') {
      if (!validateTirePayload()) return;
    } else if (!validateVehiclePayload()) {
      return;
    }

    setBusy(true);
    try {
      const imageUrls = await uploadAllImages();
      const desc = description.trim();
      const descPayload =
        desc.length > 0 ? { description_ro: desc, description_ru: desc, description: desc } : {};

      if (listingMode === 'tire') {
        const w = parseStrictUnsignedIntString(widthMmStr)!;
        const ar = parseStrictUnsignedIntString(aspectRatioStr)!;
        const d = parseTireDiameterInch(diameterStr)!;
        const q = parseInt(quantityStr, 10);
        const loadIdx = loadIndexStr.trim();
        const spd = speedIndexStr.trim().toUpperCase();
        const tirePayload = {
          brand_id: tireBrandId,
          model_id: tireModelId || undefined,
          tire_vehicle_type: tireVehicleType,
          season: tireSeason,
          condition: tireCondition,
          width_mm: w,
          aspect_ratio: ar,
          diameter_inch: d,
          quantity: q,
          load_index: loadIdx ? loadIdx : undefined,
          speed_index: spd || undefined,
          studded: studded || undefined,
          run_flat: runFlat || undefined,
          reinforced_xl: reinforcedXl || undefined,
          spare_donut: spareDonut || undefined,
          tubeless: tubeless || undefined,
          acoustic: acoustic || undefined,
        };
        const base = {
          category: 'tire' as const,
          title: title.trim() || undefined,
          ...descPayload,
          price: Math.round(Number(price)),
          currency: 'EUR' as const,
          city: city.trim(),
          images: imageUrls,
          tire: tirePayload,
        };
        if (editId) {
          const { data } = await mobileListingsApi.update(editId, base);
          await mobileListingsApi.publish(data.id);
        } else {
          const { data } = await mobileListingsApi.create(base);
          await mobileListingsApi.publish(data.id);
        }
      } else {
        let engineDispl: number | undefined;
        if (engineDisplStr.trim()) {
          const ed = parseFloat(engineDisplStr.replace(',', '.'));
          if (Number.isFinite(ed) && ed >= 0 && ed <= 99) engineDispl = ed;
        }
        if (fuel === FuelType.Electric) engineDispl = undefined;
        const payload = {
          category: 'vehicle' as const,
          title: title.trim(),
          ...descPayload,
          price: Math.round(Number(price)),
          currency: 'EUR' as const,
          city: city.trim(),
          images: imageUrls,
          vehicle: {
            brand_id: brandId,
            model_id: modelId,
            year: Number(year),
            mileage_km: mileage ? Number(mileage) : undefined,
            fuel,
            transmission,
            drive_type: driveType,
            body_type: bodyType as BodyType,
            engine_displ_l: engineDispl,
          },
        };
        if (editId) {
          const { data } = await mobileListingsApi.update(editId, payload);
          await mobileListingsApi.publish(data.id);
        } else {
          const { data } = await mobileListingsApi.create(payload);
          await mobileListingsApi.publish(data.id);
        }
      }
      Alert.alert(t('common.success'), t('mobile.create.success'));
      setImages([]);
      setTitle('');
      setDescription('');
      setPrice('');
      setMileage('');
      setWidthMmStr('');
      setAspectRatioStr('');
      setDiameterStr('');
      setQuantityStr('4');
      setLoadIndexStr('');
      setSpeedIndexStr('');
      setStudded(false);
      setRunFlat(false);
      setReinforcedXl(false);
      setSpareDonut(false);
      setTubeless(false);
      setAcoustic(false);
      router.push(`/(tabs)`);
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  function closeBrandSheet() {
    setBrandSheet(false);
    setBrandQuery('');
  }

  function closeTireBrandSheet() {
    setTireBrandSheet(false);
    setTireBrandQuery('');
  }

  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }

  if (!user) {
    return (
      <MobileAppShell title={t('mobile.create.title')}>
        <AuthRequiredScreen titleKey="mobile.create.needAuth" />
      </MobileAppShell>
    );
  }

  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedModel = models.find((m) => m.id === modelId);
  const selectedTireBrand = tireBrands.find((b) => b.id === tireBrandId);
  const selectedTireModel = tireModels.find((m) => m.id === tireModelId);

  return (
    <MobileAppShell title={editId ? t('mobile.create.editTitle') : t('mobile.create.title')}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

      {!editId ? (
        <View style={styles.categoryRow}>
          <Pressable
            style={[styles.catChip, listingMode === 'vehicle' && styles.catChipActive]}
            onPress={() => switchListingMode('vehicle')}
          >
            <Text style={[styles.catChipText, listingMode === 'vehicle' && styles.catChipTextActive]}>
              {t('mobile.create.modeVehicle')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.catChip, listingMode === 'tire' && styles.catChipActive]}
            onPress={() => switchListingMode('tire')}
          >
            <Text style={[styles.catChipText, listingMode === 'tire' && styles.catChipTextActive]}>
              {t('mobile.create.modeTire')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.hidePlatesRow}>
        <Text style={styles.label}>{t('listings.hidePlates')}</Text>
        <Switch value={hidePlates} onValueChange={setHidePlates} />
      </View>
      <Text style={styles.helper}>{t('listings.hidePlatesHelper')}</Text>

      <View style={styles.row}>
        <Pressable style={styles.btnSecondary} onPress={pickGallery}>
          <Text style={styles.btnSecondaryText}>{t('mobile.create.pickImages')}</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={takePhoto}>
          <Text style={styles.btnSecondaryText}>{t('mobile.create.takePhoto')}</Text>
        </Pressable>
      </View>
      <Text style={styles.meta}>{t('mobile.create.photoCount', { count: images.length })}</Text>

      {listingMode === 'vehicle' ? (
        <>
          <Text style={styles.sectionLabel}>{t('mobile.catalog.vehicleType')}</Text>
          <View style={styles.categoryRow}>
            {(['car', 'truck', 'moto'] as const).map((vk) => (
              <Pressable
                key={vk}
                style={[styles.kindChip, vehicleKind === vk && styles.kindChipActive]}
                onPress={() => switchVehicleKind(vk)}
              >
                <Text style={[styles.kindChipText, vehicleKind === vk && styles.kindChipTextActive]}>
                  {t(`mobile.catalog.vehicleType_${vk}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{t('mobile.create.brand')}</Text>
          <Pressable style={styles.select} onPress={() => setBrandSheet(true)}>
            <Text style={styles.selectText}>{selectedBrand?.name ?? t('mobile.create.selectBrand')}</Text>
          </Pressable>

          <Text style={styles.label}>{t('mobile.create.model')}</Text>
          <Pressable style={styles.select} onPress={() => brandId && setModelSheet(true)} disabled={!brandId}>
            <Text style={[styles.selectText, !brandId && styles.selectTextDisabled]}>
              {selectedModel?.name ?? t('mobile.create.selectModel')}
            </Text>
          </Pressable>

          <Text style={styles.label}>{t('mobile.create.year')}</Text>
          <TextInput value={year} onChangeText={setYear} keyboardType="number-pad" style={styles.input} />

          <Text style={styles.label}>{t('mobile.create.mileage')}</Text>
          <TextInput value={mileage} onChangeText={setMileage} keyboardType="number-pad" style={styles.input} />

          <Text style={styles.label}>{t('listings.fuelLabel')}</Text>
          <Pressable style={styles.select} onPress={() => setFuelSheet(true)}>
            <Text style={styles.selectText}>{fuel}</Text>
          </Pressable>

          <Text style={styles.label}>{t('listings.transmissionLabel')}</Text>
          <Pressable style={styles.select} onPress={() => setTransmissionSheet(true)}>
            <Text style={styles.selectText}>{transmission}</Text>
          </Pressable>

          <Text style={styles.label}>{t('listings.driveTypeLabel')}</Text>
          <Pressable style={styles.select} onPress={() => setDriveSheet(true)}>
            <Text style={styles.selectText}>{driveType}</Text>
          </Pressable>

          <Text style={styles.label}>{t('listings.engineDisplacementLabel')}</Text>
          <TextInput
            value={engineDisplStr}
            onChangeText={setEngineDisplStr}
            keyboardType="decimal-pad"
            style={[styles.input, fuel === FuelType.Electric && styles.inputDisabled]}
            editable={fuel !== FuelType.Electric}
          />

          <Text style={styles.label}>{t('mobile.create.bodyType')}</Text>
          <Pressable style={styles.select} onPress={() => setBodyTypeSheet(true)}>
            <Text style={styles.selectText}>{bodyType}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>{t('listings.tireForm.compatibleVehicleType')}</Text>
          <View style={styles.categoryRow}>
            {(['car', 'truck', 'moto'] as const).map((vk) => (
              <Pressable
                key={vk}
                style={[styles.kindChip, tireVehicleType === vk && styles.kindChipActive]}
                onPress={() => setTireVehicleType(vk)}
              >
                <Text style={[styles.kindChipText, tireVehicleType === vk && styles.kindChipTextActive]}>
                  {t(`searchFilters.tireVehicleType.${vk}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{t('searchFilters.tireBrand')}</Text>
          <Pressable style={styles.select} onPress={() => setTireBrandSheet(true)}>
            <Text style={styles.selectText}>{selectedTireBrand?.name ?? t('searchFilters.selectTireBrands')}</Text>
          </Pressable>

          <Text style={styles.label}>{t('searchFilters.tireModel')}</Text>
          <Pressable
            style={styles.select}
            onPress={() => tireBrandId && setTireModelSheet(true)}
            disabled={!tireBrandId}
          >
            <Text style={[styles.selectText, !tireBrandId && styles.selectTextDisabled]}>
              {selectedTireModel?.name ?? t('listings.tireForm.modelNotSelected')}
            </Text>
          </Pressable>

          <Text style={styles.label}>{t('searchFilters.tireTreadLabel')}</Text>
          <Pressable style={styles.select} onPress={() => setTireSeasonSheet(true)}>
            <Text style={styles.selectText}>{t(`searchFilters.tireTreadOption.${tireSeason}`)}</Text>
          </Pressable>

          <Text style={styles.label}>{t('searchFilters.tireConditionLabel')}</Text>
          <Pressable style={styles.select} onPress={() => setTireConditionSheet(true)}>
            <Text style={styles.selectText}>{t(`searchFilters.tireConditionOption.${tireCondition}`)}</Text>
          </Pressable>

          <Text style={styles.label}>{t('searchFilters.tireSizeCriteria')}</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Text style={styles.subLabel}>{t('searchFilters.tireWidth')}</Text>
              <TextInput
                value={widthMmStr}
                onChangeText={setWidthMmStr}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.subLabel}>{t('searchFilters.tireProfile')}</Text>
              <TextInput
                value={aspectRatioStr}
                onChangeText={setAspectRatioStr}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.subLabel}>{t('searchFilters.tireDiameter')}</Text>
              <TextInput
                value={diameterStr}
                onChangeText={setDiameterStr}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>
          </View>

          <Text style={styles.label}>{t('searchFilters.tireQuantityLabel')}</Text>
          <Pressable style={styles.select} onPress={() => setTireQuantitySheet(true)}>
            <Text style={styles.selectText}>{quantityStr}</Text>
          </Pressable>

          <Text style={styles.label}>{t('listings.tireForm.loadIndex')}</Text>
          <TextInput value={loadIndexStr} onChangeText={setLoadIndexStr} keyboardType="number-pad" style={styles.input} />

          <Text style={styles.label}>{t('listings.tireForm.speedIndex')}</Text>
          <Pressable style={styles.select} onPress={() => setTireSpeedSheet(true)}>
            <Text style={styles.selectText}>
              {speedIndexStr.trim()
                ? speedIndexStr.trim().toUpperCase()
                : t('listings.tireForm.speedIndexNone')}
            </Text>
          </Pressable>

          <Text style={styles.sectionLabel}>{t('searchFilters.tireOptionsLabel')}</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('searchFilters.tireStudded')}</Text>
            <Switch value={studded} onValueChange={setStudded} trackColor={switchTrack} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('searchFilters.tireRunFlat')}</Text>
            <Switch value={runFlat} onValueChange={setRunFlat} trackColor={switchTrack} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('searchFilters.tireReinforcedXl')}</Text>
            <Switch value={reinforcedXl} onValueChange={setReinforcedXl} trackColor={switchTrack} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('searchFilters.tireSpareDonut')}</Text>
            <Switch value={spareDonut} onValueChange={setSpareDonut} trackColor={switchTrack} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('searchFilters.tireTubeless')}</Text>
            <Switch value={tubeless} onValueChange={setTubeless} trackColor={switchTrack} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('searchFilters.tireAcoustic')}</Text>
            <Switch value={acoustic} onValueChange={setAcoustic} trackColor={switchTrack} />
          </View>
        </>
      )}

      <Text style={styles.label}>{t('mobile.create.price')}</Text>
      <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.input} />

      <Text style={styles.label}>{t('mobile.create.city')}</Text>
      <Pressable style={styles.select} onPress={() => setCitySheet(true)}>
        <Text style={styles.selectText}>{city || t('mobile.create.selectCity')}</Text>
      </Pressable>

      <Text style={styles.label}>
        {t('mobile.create.listingTitle')}
        {listingMode === 'tire' ? ` (${t('listings.optionalShort')})` : ''}
      </Text>
      <TextInput value={title} onChangeText={setTitle} style={styles.input} />

      <Text style={styles.label}>{t('mobile.create.description')}</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        style={[styles.input, styles.textArea]}
      />

      <Pressable
        style={[styles.btnPrimary, busy && styles.btnDisabled]}
        onPress={onSubmit}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={colors.bg.partnerLogo} />
        ) : (
          <Text style={styles.btnPrimaryText}>{t('mobile.create.submit')}</Text>
        )}
      </Pressable>

      <MobileBottomSheet visible={brandSheet} onClose={closeBrandSheet} title={t('mobile.create.brand')}>
        <TextInput
          placeholder={t('common.search')}
          value={brandQuery}
          onChangeText={setBrandQuery}
          style={styles.input}
        />
        <FlatList
          data={filteredBrands}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: sheetListMaxHeight }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item.id === brandId && styles.sheetRowSelected]}
              onPress={() => {
                setBrandId(item.id);
                closeBrandSheet();
              }}
            >
              <Text style={styles.sheetRowText}>{item.name}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={closeBrandSheet}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet visible={modelSheet} onClose={() => setModelSheet(false)} title={t('mobile.create.model')}>
        <FlatList
          data={models}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: sheetListMaxHeight + 56 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item.id === modelId && styles.sheetRowSelected]}
              onPress={() => {
                setModelId(item.id);
                setModelSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{item.name}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setModelSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet
        visible={bodyTypeSheet}
        onClose={() => setBodyTypeSheet(false)}
        title={t('mobile.create.bodyType')}
      >
        <FlatList
          data={[...bodyTypes]}
          keyExtractor={(item) => item}
          style={{ maxHeight: sheetListMaxHeight + 56 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item === bodyType && styles.sheetRowSelected]}
              onPress={() => {
                setBodyType(item);
                setBodyTypeSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{item}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setBodyTypeSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet visible={fuelSheet} onClose={() => setFuelSheet(false)} title={t('listings.fuelLabel')}>
        <FlatList
          data={FUEL_VALUES}
          keyExtractor={(item) => item}
          style={{ maxHeight: sheetListMaxHeight + 56 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item === fuel && styles.sheetRowSelected]}
              onPress={() => {
                setFuel(item);
                setFuelSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{item}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setFuelSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet
        visible={transmissionSheet}
        onClose={() => setTransmissionSheet(false)}
        title={t('listings.transmissionLabel')}
      >
        <FlatList
          data={TRANSMISSION_VALUES}
          keyExtractor={(item) => item}
          style={{ maxHeight: sheetListMaxHeight + 56 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item === transmission && styles.sheetRowSelected]}
              onPress={() => {
                setTransmission(item);
                setTransmissionSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{item}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setTransmissionSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet
        visible={driveSheet}
        onClose={() => setDriveSheet(false)}
        title={t('listings.driveTypeLabel')}
      >
        <FlatList
          data={DRIVE_VALUES}
          keyExtractor={(item) => item}
          style={{ maxHeight: sheetListMaxHeight + 56 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item === driveType && styles.sheetRowSelected]}
              onPress={() => {
                setDriveType(item);
                setDriveSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{item}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setDriveSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet visible={tireBrandSheet} onClose={closeTireBrandSheet} title={t('searchFilters.tireBrand')}>
        <TextInput
          placeholder={t('common.search')}
          value={tireBrandQuery}
          onChangeText={setTireBrandQuery}
          style={styles.input}
        />
        <FlatList
          data={filteredTireBrands}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: sheetListMaxHeight }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item.id === tireBrandId && styles.sheetRowSelected]}
              onPress={() => {
                setTireBrandId(item.id);
                closeTireBrandSheet();
              }}
            >
              <Text style={styles.sheetRowText}>{item.name}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={closeTireBrandSheet}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet
        visible={tireModelSheet}
        onClose={() => setTireModelSheet(false)}
        title={t('searchFilters.tireModel')}
      >
        <FlatList
          data={tireModels}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: sheetListMaxHeight + 56 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                setTireModelId('');
                setTireModelSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{t('listings.tireForm.modelNotSelected')}</Text>
            </Pressable>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item.id === tireModelId && styles.sheetRowSelected]}
              onPress={() => {
                setTireModelId(item.id);
                setTireModelSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{item.name}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setTireModelSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet
        visible={tireSeasonSheet}
        onClose={() => setTireSeasonSheet(false)}
        title={t('searchFilters.tireTreadLabel')}
      >
        <FlatList
          data={[...TIRE_TREAD_VALUES]}
          keyExtractor={(item) => item}
          style={{ maxHeight: sheetListMaxHeight + 56 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item === tireSeason && styles.sheetRowSelected]}
              onPress={() => {
                setTireSeason(item);
                setTireSeasonSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{t(`searchFilters.tireTreadOption.${item}`)}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setTireSeasonSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet
        visible={tireConditionSheet}
        onClose={() => setTireConditionSheet(false)}
        title={t('searchFilters.tireConditionLabel')}
      >
        <FlatList
          data={TIRE_CONDITIONS}
          keyExtractor={(item) => item}
          style={{ maxHeight: sheetListMaxHeight + 56 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item === tireCondition && styles.sheetRowSelected]}
              onPress={() => {
                setTireCondition(item);
                setTireConditionSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{t(`searchFilters.tireConditionOption.${item}`)}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setTireConditionSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet
        visible={tireQuantitySheet}
        onClose={() => setTireQuantitySheet(false)}
        title={t('searchFilters.tireQuantityLabel')}
      >
        <FlatList
          data={quantityOptions}
          keyExtractor={(item) => item}
          style={{ maxHeight: sheetListMaxHeight + 56 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item === quantityStr && styles.sheetRowSelected]}
              onPress={() => {
                setQuantityStr(item);
                setTireQuantitySheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{item}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setTireQuantitySheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet
        visible={tireSpeedSheet}
        onClose={() => setTireSpeedSheet(false)}
        title={t('listings.tireForm.speedIndex')}
      >
        <FlatList
          data={['', ...TIRE_SPEED_INDEX_LETTERS]}
          keyExtractor={(item) => item || 'none'}
          style={{ maxHeight: sheetListMaxHeight + 56 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.sheetRow,
                (item || '') === (speedIndexStr.trim().toUpperCase() || '') && styles.sheetRowSelected,
              ]}
              onPress={() => {
                setSpeedIndexStr(item);
                setTireSpeedSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>
                {item ? item : t('listings.tireForm.speedIndexNone')}
              </Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setTireSpeedSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet visible={citySheet} onClose={() => setCitySheet(false)} title={t('mobile.create.city')}>
        <FlatList
          data={cities}
          keyExtractor={(item) => item.name}
          style={{ maxHeight: sheetListMaxHeight + 56 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                setCity('');
                setCitySheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{t('common.rangeDash')}</Text>
            </Pressable>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item.name === city && styles.sheetRowSelected]}
              onPress={() => {
                setCity(item.name);
                setCitySheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{item.name}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setCitySheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>
    </ScrollView>
    </MobileAppShell>
  );
}

const switchTrack = { false: colors.divider, true: colors.primary[500] };

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.base },
  scrollContent: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hint: { marginBottom: 12, color: colors.text.secondary, textAlign: 'center' },
  screenTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: colors.text.primary },
  categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  catChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary[500],
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.bg.partnerLogo,
  },
  catChipActive: { backgroundColor: colors.primary[500] },
  catChipText: { color: colors.primary[700], fontWeight: '600' },
  catChipTextActive: { color: colors.bg.partnerLogo },
  kindChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.bg.partnerLogo,
  },
  kindChipActive: { borderColor: colors.primary[500], backgroundColor: colors.primary[50] },
  kindChipText: { fontSize: 12, color: colors.text.primary, fontWeight: '600' },
  kindChipTextActive: { color: colors.primary[700] },
  sectionLabel: {
    marginTop: 4,
    marginBottom: 6,
    fontWeight: '600',
    color: colors.text.secondary,
    fontSize: 13,
  },
  subLabel: { fontSize: 12, color: colors.text.secondary, marginBottom: 4 },
  flex1: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  switchLabel: { flex: 1, paddingRight: 12, color: colors.text.primary },
  hidePlatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  helper: { fontSize: 12, color: colors.text.secondary, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btnPrimary: {
    backgroundColor: colors.primary[500],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  btnPrimaryText: { color: colors.bg.partnerLogo, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
  btnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary[500],
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondaryText: { color: colors.primary[700], fontWeight: '600' },
  meta: { fontSize: 12, color: colors.text.secondary, marginBottom: 12 },
  label: { marginTop: 8, marginBottom: 4, color: colors.text.secondary },
  input: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    padding: 10,
    backgroundColor: colors.bg.partnerLogo,
    color: colors.text.primary,
  },
  inputDisabled: { opacity: 0.55 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  select: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.bg.partnerLogo,
  },
  selectText: { color: colors.text.primary },
  selectTextDisabled: { color: colors.text.secondary },
  sheetRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sheetRowSelected: { backgroundColor: colors.primary[50] },
  sheetRowText: { fontSize: 16, color: colors.text.primary },
  sheetCloseBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.primary[500],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
});
