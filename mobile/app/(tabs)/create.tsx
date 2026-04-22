import { Picker } from '@react-native-picker/picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { mobileBrandsApi } from '@/api/brands';
import { mobileCitiesApi } from '@/api/cities';
import { mobileListingsApi } from '@/api/listings';
import { mobileUploadApi } from '@/api/upload';
import { useAuth } from '@/auth/AuthContext';
import { Text } from '@/components/Themed';
import { useI18n } from '@/i18n/I18nContext';
import type { Brand, City, Listing, VehicleModel } from '@/synced/api-types';
import {
  BODY_TYPES_BY_VEHICLE_TYPE,
  DriveType,
  FuelType,
  TransmissionType,
} from '@/synced/constants';
import colors from '@/theme/synced/colors';

type LocalImage = { uri: string; uploadedUrl?: string };

export default function CreateListingScreen() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
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
  const [images, setImages] = useState<LocalImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [brandModal, setBrandModal] = useState(false);
  const [modelModal, setModelModal] = useState(false);
  const [brandQuery, setBrandQuery] = useState('');

  const bodyTypes = BODY_TYPES_BY_VEHICLE_TYPE.car;

  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, brandQuery]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [b, c] = await Promise.all([mobileBrandsApi.getAll('car'), mobileCitiesApi.getAll()]);
      if (!cancelled) {
        setBrands(b.data);
        setCities(c.data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!brandId) {
      setModels([]);
      setModelId('');
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await mobileBrandsApi.getModels(brandId, 'car');
      if (!cancelled) setModels(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId]);

  const loadEdit = useCallback(
    async (id: string) => {
      const { data } = await mobileListingsApi.getOne(id);
      const l = data as Listing;
      setTitle(l.title);
      setDescription(l.description ?? '');
      setPrice(l.price != null ? String(l.price) : '');
      setCity(l.city);
      if (l.vehicle) {
        setBrandId(l.vehicle.brand_id);
        setModelId(l.vehicle.model_id);
        setYear(String(l.vehicle.year));
        setMileage(l.vehicle.mileage_km != null ? String(l.vehicle.mileage_km) : '');
        setBodyType(l.vehicle.body_type);
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
      const { data } = await mobileUploadApi.uploadImage(formData);
      urls.push(data.url);
    }
    return urls;
  }

  async function onSubmit() {
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    if (!brandId || !modelId || !year || !price || !city || !title) {
      Alert.alert(t('common.error'), t('common.requiredAsterisk'));
      return;
    }
    setBusy(true);
    try {
      const imageUrls = await uploadAllImages();
      const payload = {
        category: 'vehicle' as const,
        title: title.trim(),
        description: description.trim() || undefined,
        price: Math.round(Number(price)),
        currency: 'EUR' as const,
        city: city.trim(),
        images: imageUrls,
        vehicle: {
          brand_id: brandId,
          model_id: modelId,
          year: Number(year),
          mileage_km: mileage ? Number(mileage) : undefined,
          fuel: FuelType.Petrol,
          transmission: TransmissionType.Manual,
          drive_type: DriveType.FWD,
          body_type: bodyType as (typeof bodyTypes)[number],
        },
      };
      if (editId) {
        const { data } = await mobileListingsApi.update(editId, payload);
        await mobileListingsApi.publish(data.id);
        Alert.alert(t('common.success'), t('mobile.create.success'));
      } else {
        const { data } = await mobileListingsApi.create(payload);
        await mobileListingsApi.publish(data.id);
        Alert.alert(t('common.success'), t('mobile.create.success'));
      }
      setImages([]);
      setTitle('');
      setDescription('');
      setPrice('');
      setMileage('');
      router.push(`/(tabs)`);
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setBusy(false);
    }
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
      <View style={styles.centered}>
        <Text style={styles.hint}>{t('mobile.favorites.needAuth')}</Text>
        <Pressable style={styles.btnPrimary} onPress={() => router.push('/auth/sign-in')}>
          <Text style={styles.btnPrimaryText}>{t('mobile.auth.signIn')}</Text>
        </Pressable>
      </View>
    );
  }

  const selectedBrand = brands.find((b) => b.id === brandId);
  const selectedModel = models.find((m) => m.id === modelId);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.screenTitle}>
        {editId ? t('mobile.create.editTitle') : t('mobile.create.title')}
      </Text>

      <View style={styles.row}>
        <Pressable style={styles.btnSecondary} onPress={pickGallery}>
          <Text style={styles.btnSecondaryText}>{t('mobile.create.pickImages')}</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={takePhoto}>
          <Text style={styles.btnSecondaryText}>{t('mobile.create.takePhoto')}</Text>
        </Pressable>
      </View>
      <Text style={styles.meta}>{images.length} photos</Text>

      <Text style={styles.label}>{t('mobile.create.brand')}</Text>
      <Pressable style={styles.select} onPress={() => setBrandModal(true)}>
        <Text>{selectedBrand?.name ?? t('mobile.create.selectBrand')}</Text>
      </Pressable>

      <Text style={styles.label}>{t('mobile.create.model')}</Text>
      <Pressable style={styles.select} onPress={() => brandId && setModelModal(true)}>
        <Text>{selectedModel?.name ?? t('mobile.create.selectModel')}</Text>
      </Pressable>

      <Text style={styles.label}>{t('mobile.create.year')}</Text>
      <TextInput value={year} onChangeText={setYear} keyboardType="number-pad" style={styles.input} />

      <Text style={styles.label}>{t('mobile.create.mileage')}</Text>
      <TextInput value={mileage} onChangeText={setMileage} keyboardType="number-pad" style={styles.input} />

      <Text style={styles.label}>{t('mobile.create.bodyType')}</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={bodyType} onValueChange={(v) => setBodyType(String(v))}>
          {bodyTypes.map((bt) => (
            <Picker.Item key={bt} label={bt} value={bt} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>{t('mobile.create.price')}</Text>
      <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" style={styles.input} />

      <Text style={styles.label}>{t('mobile.create.city')}</Text>
      <View style={styles.pickerWrap}>
        <Picker selectedValue={city} onValueChange={(v) => setCity(String(v))}>
          <Picker.Item label="—" value="" />
          {cities.map((c) => (
            <Picker.Item
              key={c.name}
              label={c.name}
              value={c.name}
            />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>{t('mobile.create.listingTitle')}</Text>
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
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnPrimaryText}>{t('mobile.create.submit')}</Text>
        )}
      </Pressable>

      <Modal visible={brandModal} animationType="slide">
        <View style={styles.modal}>
          <TextInput
            placeholder={t('common.search')}
            value={brandQuery}
            onChangeText={setBrandQuery}
            style={styles.input}
          />
          <FlatList
            data={filteredBrands}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.modalRow}
                onPress={() => {
                  setBrandId(item.id);
                  setBrandModal(false);
                  setBrandQuery('');
                }}
              >
                <Text>{item.name}</Text>
              </Pressable>
            )}
          />
          <Pressable style={styles.btnSecondary} onPress={() => setBrandModal(false)}>
            <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </Modal>

      <Modal visible={modelModal} animationType="slide">
        <View style={styles.modal}>
          <FlatList
            data={models}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.modalRow}
                onPress={() => {
                  setModelId(item.id);
                  setModelModal(false);
                }}
              >
                <Text>{item.name}</Text>
              </Pressable>
            )}
          />
          <Pressable style={styles.btnSecondary} onPress={() => setModelModal(false)}>
            <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
          </Pressable>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.base },
  scrollContent: { padding: 16, paddingBottom: 48 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hint: { marginBottom: 12, color: colors.text.secondary, textAlign: 'center' },
  screenTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: colors.text.primary },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btnPrimary: {
    backgroundColor: colors.primary[500],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
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
    backgroundColor: '#fff',
    color: colors.text.primary,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  select: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  modal: { flex: 1, padding: 16, paddingTop: 48, backgroundColor: colors.bg.base },
  modalRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
});
