import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { API_URL } from '../api/config';

const resenasPorDefecto = [
  { nombre: 'Camila R.', texto: 'Presentación impecable y sabores muy equilibrados.', estrellas: 5 },
  { nombre: 'Julián M.', texto: 'Una experiencia elegante, volvería sin pensarlo.', estrellas: 5 },
];

const platos = [
  {
    id: 'corte',
    categoria: 'plato',
    nombre: 'Corte al carbón',
    detalle: 'Puré rústico · chimichurri',
    precio: '$ 48.000',
    imagen: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'pasta',
    categoria: 'plato',
    nombre: 'Pasta de la casa',
    detalle: 'Pomodoro asado · albahaca',
    precio: '$ 35.000',
    imagen: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'postre',
    categoria: 'postre',
    nombre: 'Cacao & avellana',
    detalle: 'Postre de autor · vainilla',
    precio: '$ 22.000',
    imagen: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80',
  },
];

const categorias = [
  { id: 'entrada', titulo: 'Entradas' }, { id: 'plato', titulo: 'Platos' },
  { id: 'bebida', titulo: 'Bebidas' }, { id: 'coctel', titulo: 'Cócteles' }, { id: 'postre', titulo: 'Postres' },
];

export default function HomeScreen({ navigation, route }) {
  const { user } = route.params;
  const [seleccionados, setSeleccionados] = useState([]);
  const [carta, setCarta] = useState(platos);
  const [fotoUri, setFotoUri] = useState(null);
  const [productoDetalle, setProductoDetalle] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/menu`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('No se pudo cargar la carta.')))
      .then((items) => {
        const disponibles = items.filter((item) => item.disponible);
        if (disponibles.length) {
          setCarta(disponibles);
        }
      })
      .catch((error) => console.warn(error.message));
  }, []);

  const alternarPlato = (item) => setSeleccionados((actuales) => actuales.some((seleccionado) => seleccionado.id === item.id)
    ? actuales.filter((seleccionado) => seleccionado.id !== item.id) : [...actuales, item]);

  const abrirGaleria = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso necesario', 'Permite acceder a la galería para elegir una foto.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!resultado.canceled) {
      setFotoUri(resultado.assets[0].uri);
    }
  };

  const irAReserva = () => {
    navigation.navigate('AgendarReserva', {
      user,
      token: route.params.token,
      platos: seleccionados.map((item) => item.nombre),
      fotoUri,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80' }}
        style={styles.ambientImage}
        blurRadius={7}
      />
      <View style={styles.ambientShade} />
      <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.eyebrow}>RESTAURANTE Z'eloura</Text>
            <Text style={styles.welcome}>Hola, {user.nombre?.split(' ')[0] || 'invitado'}.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={styles.avatar}
            onPress={() => navigation.navigate('Perfil', { user, token: route.params.token })}
          >
            {user.foto_uri ? <Image source={{ uri: user.foto_uri }} style={styles.avatarPhoto} /> : <Text style={styles.avatarText}>{(user.nombre || 'U').charAt(0).toUpperCase()}</Text>}
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTag}>Cocina contemporánea</Text>
          <Text style={styles.heroTitle}>Una mesa para{`\n`}recordar.</Text>
          <Text style={styles.heroText}>Reserva tu experiencia y déjanos preparar cada detalle.</Text>
          <Pressable style={styles.primaryButton} onPress={irAReserva}>
            <Text style={styles.primaryButtonText}>Reservar una mesa</Text>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Tu experiencia</Text>
        <View style={styles.modules}>
          <Pressable style={[styles.module, styles.moduleFeatured]} onPress={irAReserva}>
            <Text style={styles.moduleNumber}>01</Text>
            <Text style={styles.moduleTitle}>Reservar</Text>
            <Text style={styles.moduleText}>Fecha, hora y mesa</Text>
          </Pressable>
          <Pressable style={styles.module} onPress={() => scrollRef.current?.scrollTo({ y: 580, animated: true })}>
            <Text style={styles.moduleNumber}>02</Text>
            <Text style={styles.moduleTitle}>Carta</Text>
            <Text style={styles.moduleText}>Elige tu favorito</Text>
          </Pressable>
          <Pressable style={styles.module} onPress={abrirGaleria}>
            <Text style={styles.moduleNumber}>03</Text>
            <Text style={styles.moduleTitle}>Tu foto</Text>
            <Text style={styles.moduleText}>{fotoUri ? 'Foto seleccionada' : 'Añade un recuerdo'}</Text>
          </Pressable>
          <Pressable style={styles.module} onPress={() => navigation.navigate('MisReservas', { user, token: route.params.token })}>
            <Text style={styles.moduleNumber}>04</Text>
            <Text style={styles.moduleTitle}>Mis mesas</Text>
            <Text style={styles.moduleText}>Consulta tus reservas</Text>
          </Pressable>
          <Pressable style={styles.module} onPress={() => Alert.alert("Z'eloura", 'Tu próxima experiencia empieza con una reserva.') }>
            <Text style={styles.moduleNumber}>05</Text>
            <Text style={styles.moduleTitle}>Detalles</Text>
            <Text style={styles.moduleText}>Una atención especial</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Carta</Text>
            <Text style={styles.sectionSubtitle}>Puedes elegir varios productos para tu reserva</Text>
          </View>
          <Text style={styles.count}>{seleccionados.length} ELEGIDOS</Text>
        </View>

        {categorias.map((categoria) => {
          const productos = carta.filter((item) => item.categoria === categoria.id || (categoria.id === 'bebida' && item.categoria === 'vino'));
          if (!productos.length) return null;
          return <View key={categoria.id} style={styles.categoryGroup}>
            <Text style={styles.categoryTitle}>{categoria.titulo.toUpperCase()}</Text>
            {productos.map((plato) => {
              const seleccionado = seleccionados.some((item) => item.id === plato.id);
              const resenas = obtenerResenas(plato.resenas);
              return <Pressable key={plato.id} style={[styles.dishCard, seleccionado && styles.dishCardSelected]} onPress={() => alternarPlato(plato)}>
                <Pressable accessibilityRole="imagebutton" accessibilityLabel={`Ver detalles de ${plato.nombre}`} onPress={(event) => { event.stopPropagation(); setProductoDetalle({ ...plato, resenas }); }}>
                  {plato.imagen ? <Image source={{ uri: plato.imagen }} style={styles.dishImage} /> : <View style={styles.dishImage} />}
                </Pressable>
                <View style={styles.dishInfo}><Text style={styles.dishName}>{plato.nombre}</Text><Text style={styles.dishDetail}>{plato.detalle}</Text><View style={styles.ratingLine}><Text style={styles.stars}>★★★★★</Text><Text style={styles.ratingText}>{Number(plato.calificacion || 4.8).toFixed(1)} · {plato.porcentaje_estrellas || 96}%</Text></View><Text style={styles.dishPrice}>{typeof plato.precio === 'number' ? `$ ${plato.precio.toLocaleString('es-CO')}` : plato.precio}</Text></View>
                <View style={[styles.radio, seleccionado && styles.radioSelected]}>{seleccionado && <View style={styles.radioDot} />}</View>
              </Pressable>;
            })}
          </View>;
        })}

        <Pressable style={styles.photoCard} onPress={abrirGaleria}>
          {fotoUri ? (
            <Image source={{ uri: fotoUri }} style={styles.userPhoto} />
          ) : (
            <View style={styles.photoPlaceholder}><Text style={styles.photoIcon}>＋</Text></View>
          )}
          <View style={styles.photoCopy}>
            <Text style={styles.photoTitle}>{fotoUri ? 'Tu foto está lista' : 'Añade una foto'}</Text>
            <Text style={styles.photoText}>Puedes incluirla como referencia en tu reserva.</Text>
          </View>
          <Text style={styles.photoAction}>{fotoUri ? 'Cambiar' : 'Elegir'}</Text>
        </Pressable>

        <Pressable style={[styles.primaryButton, styles.bottomButton]} onPress={irAReserva}>
          <Text style={styles.primaryButtonText}>Continuar a reserva</Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      </ScrollView>
      <Modal visible={Boolean(productoDetalle)} animationType="slide" transparent onRequestClose={() => setProductoDetalle(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.productModal}>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar detalle" style={styles.closeButton} onPress={() => setProductoDetalle(null)}><Text style={styles.closeText}>×</Text></Pressable>
            {productoDetalle?.imagen ? <Image source={{ uri: productoDetalle.imagen }} style={styles.modalImage} /> : <View style={[styles.modalImage, styles.modalImageEmpty]} />}
            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalCategory}>{productoDetalle?.categoria?.toUpperCase()}</Text>
              <Text style={styles.modalTitle}>{productoDetalle?.nombre}</Text>
              <View style={styles.modalRating}><Text style={styles.modalStars}>★★★★★</Text><Text style={styles.modalRatingText}>{Number(productoDetalle?.calificacion || 4.8).toFixed(1)} · {productoDetalle?.porcentaje_estrellas || 96}% de valoraciones positivas</Text></View>
              <Text style={styles.modalPrice}>{typeof productoDetalle?.precio === 'number' ? `$ ${productoDetalle.precio.toLocaleString('es-CO')}` : productoDetalle?.precio}</Text>
              <Text style={styles.reviewHeading}>Sobre este plato</Text>
              <Text style={styles.reviewDescription}>{productoDetalle?.descripcion || productoDetalle?.detalle || 'Una creación de la casa preparada con ingredientes seleccionados.'}</Text>
              <Text style={styles.reviewHeading}>Reseñas destacadas</Text>
              {productoDetalle?.resenas?.map((resena, index) => <View key={`${productoDetalle.id}-${index}`} style={styles.review}><Text style={styles.reviewStars}>{'★'.repeat(Number(resena.estrellas) || 5)}</Text><Text style={styles.reviewText}>{resena.texto}</Text><Text style={styles.reviewAuthor}>{resena.nombre}</Text></View>)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function obtenerResenas(valor) {
  try {
    const resenas = typeof valor === 'string' ? JSON.parse(valor) : valor;
    return Array.isArray(resenas) && resenas.length ? resenas : resenasPorDefecto;
  } catch {
    return resenasPorDefecto;
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: 20, paddingBottom: 36 },
  ambientImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.2 },
  ambientShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(23, 19, 15, 0.78)' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  eyebrow: { color: colors.caramelLight, fontSize: 10, letterSpacing: 2, fontWeight: '700' },
  welcome: { color: colors.cream, fontSize: 27, fontWeight: '700', marginTop: 5 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.caramel, alignItems: 'center', justifyContent: 'center' },
  avatarPhoto: { width: 42, height: 42, borderRadius: 21 },
  avatarText: { color: colors.black, fontWeight: '800', fontSize: 18 },
  hero: { backgroundColor: colors.surfaceLight, borderRadius: 22, padding: 23, borderWidth: 1, borderColor: colors.line, marginBottom: 30 },
  heroTag: { color: colors.caramelLight, fontSize: 11, letterSpacing: 1.4, fontWeight: '700', textTransform: 'uppercase' },
  heroTitle: { color: colors.cream, fontSize: 32, fontWeight: '800', lineHeight: 38, marginTop: 10 },
  heroText: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 10, marginBottom: 20 },
  primaryButton: { backgroundColor: colors.caramel, minHeight: 50, borderRadius: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryButtonText: { color: colors.black, fontWeight: '800', fontSize: 15 },
  arrow: { color: colors.black, fontWeight: '800', fontSize: 23 },
  sectionTitle: { color: colors.cream, fontWeight: '800', fontSize: 20 },
  sectionSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  modules: { marginTop: 13, marginBottom: 31 },
  module: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 16, width: '100%', minHeight: 96, marginBottom: 10, justifyContent: 'center' },
  moduleFeatured: { backgroundColor: '#3A2719', borderColor: colors.caramel },
  moduleNumber: { color: colors.caramelLight, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  moduleTitle: { color: colors.cream, fontSize: 16, fontWeight: '800', marginTop: 11 },
  moduleText: { color: colors.muted, fontSize: 11, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  categoryGroup: { marginBottom: 13 }, categoryTitle: { color: colors.caramelLight, fontSize: 11, letterSpacing: 1.3, fontWeight: '800', marginBottom: 8 },
  count: { color: colors.caramelLight, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  dishCard: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 10, marginBottom: 11, flexDirection: 'row', alignItems: 'center', minHeight: 98 },
  dishCardSelected: { borderColor: colors.caramel, backgroundColor: '#2E211A' },
  dishImage: { width: 76, height: 76, borderRadius: 11, backgroundColor: colors.surfaceLight },
  dishInfo: { flex: 1, paddingHorizontal: 12 },
  dishName: { color: colors.cream, fontSize: 15, fontWeight: '800' },
  dishDetail: { color: colors.muted, fontSize: 11, marginTop: 5 },
  dishPrice: { color: colors.caramelLight, fontSize: 12, fontWeight: '800', marginTop: 9 },
  ratingLine: { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 6 }, stars: { color: colors.caramelLight, fontSize: 11, letterSpacing: 1 }, ratingText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center', marginRight: 3 },
  radioSelected: { borderColor: colors.caramel, backgroundColor: colors.caramel },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.black },
  reviewHeading: { color: colors.caramelLight, fontSize: 10, letterSpacing: 1, fontWeight: '800', textTransform: 'uppercase', marginBottom: 6 }, reviewDescription: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 18 }, review: { borderLeftWidth: 2, borderLeftColor: colors.caramel, paddingLeft: 10, marginBottom: 13 }, reviewStars: { color: colors.caramelLight, fontSize: 10 }, reviewText: { color: colors.cream, fontSize: 12, lineHeight: 17, marginTop: 3 }, reviewAuthor: { color: colors.muted, fontSize: 10, marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(14, 11, 9, 0.82)', justifyContent: 'flex-end' }, productModal: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%', overflow: 'hidden', borderWidth: 1, borderColor: colors.line }, closeButton: { position: 'absolute', zIndex: 2, right: 16, top: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(14, 11, 9, 0.72)', alignItems: 'center', justifyContent: 'center' }, closeText: { color: colors.cream, fontSize: 27, fontWeight: '300', lineHeight: 30 }, modalImage: { width: '100%', height: 220, backgroundColor: colors.surfaceLight }, modalImageEmpty: { height: 120 }, modalContent: { padding: 22, paddingBottom: 32 }, modalCategory: { color: colors.caramelLight, fontSize: 10, letterSpacing: 1.6, fontWeight: '800' }, modalTitle: { color: colors.cream, fontSize: 27, lineHeight: 32, fontWeight: '800', marginTop: 7 }, modalRating: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 }, modalStars: { color: colors.caramelLight, fontSize: 14, letterSpacing: 1 }, modalRatingText: { color: colors.muted, fontSize: 11, flex: 1 }, modalPrice: { color: colors.caramelLight, fontSize: 18, fontWeight: '800', marginTop: 12, marginBottom: 24 },
  photoCard: { backgroundColor: '#211915', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.caramel, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  photoPlaceholder: { width: 52, height: 52, borderRadius: 12, backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' },
  photoIcon: { color: colors.caramelLight, fontSize: 28, fontWeight: '300' },
  userPhoto: { width: 52, height: 52, borderRadius: 12 },
  photoCopy: { flex: 1, paddingHorizontal: 12 },
  photoTitle: { color: colors.cream, fontSize: 14, fontWeight: '800' },
  photoText: { color: colors.muted, fontSize: 11, marginTop: 4, lineHeight: 15 },
  photoAction: { color: colors.caramelLight, fontSize: 12, fontWeight: '800' },
  bottomButton: { marginTop: 20 },
});
