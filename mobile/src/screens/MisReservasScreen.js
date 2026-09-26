import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { guardarReservaLocal, obtenerTodasReservasLocales } from '../database/sqlite';
import { sincronizarConBackend } from '../api/sync';
import { API_URL } from '../api/config';
import { colors } from '../theme';

export default function MisReservasScreen({ route, navigation }) {
  const { user, token } = route.params;
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargarReservas = useCallback(async () => {
    setCargando(true);
    try {
      const locales = await obtenerTodasReservasLocales();
      const localesDelUsuario = locales.filter((reserva) => reserva.usuario_id === user.id);
      if (!token || token === 'offline') {
        setReservas(localesDelUsuario);
        return;
      }

      await sincronizarConBackend();
      const response = await fetch(`${API_URL}/reservas`, { headers: { Authorization: `Bearer ${token}` } });
      const resultado = await response.json();
      if (!response.ok) throw new Error(resultado.mensaje || 'No se pudieron cargar tus reservas.');
      const pendientes = (await obtenerTodasReservasLocales())
        .filter((reserva) => reserva.usuario_id === user.id && !reserva.sincronizado);
      const reservasPorId = new Map(pendientes.map((reserva) => [String(reserva.id), reserva]));
      resultado.forEach((reserva) => reservasPorId.set(String(reserva.id), reserva));
      setReservas([...reservasPorId.values()].sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)));
    } catch (error) {
      console.error('No se pudieron leer las reservas:', error);
      const locales = await obtenerTodasReservasLocales();
      setReservas(locales.filter((reserva) => reserva.usuario_id === user.id));
    } finally {
      setCargando(false);
    }
  }, [user.id, token]);

  useEffect(() => { cargarReservas(); }, [cargarReservas]);

  const cancelarReserva = (reserva) => {
    Alert.alert('Cancelar reserva', '¿Seguro que deseas cancelar esta mesa?', [
      { text: 'Conservar', style: 'cancel' },
      {
        text: 'Cancelar mesa', style: 'destructive', onPress: async () => {
          await guardarReservaLocal({ ...reserva, estado: 'cancelada' });
          await sincronizarConBackend();
          cargarReservas();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={reservas}
        keyExtractor={(item) => item.id}
        refreshing={cargando}
        onRefresh={cargarReservas}
        ListHeaderComponent={<>
          <View style={styles.header}><View><Text style={styles.kicker}>RESTAURANTE Z'eloura</Text><Text style={styles.title}>Mis mesas</Text></View><Text style={styles.counter}>{reservas.length} RESERVAS</Text></View>
          <Pressable style={styles.newReservation} onPress={() => navigation.navigate('AgendarReserva', { user, token })}><Text style={styles.newReservationText}>+ Reservar una nueva mesa</Text><Text style={styles.newReservationArrow}>→</Text></Pressable>
        </>}
        ListEmptyComponent={!cargando ? <View style={styles.empty}><Text style={styles.emptyTitle}>Aún no tienes reservas</Text><Text style={styles.emptyText}>Tu próxima experiencia comienza con una mesa.</Text></View> : null}
        renderItem={({ item }) => <ReservationCard reserva={item} onCancel={() => cancelarReserva(item)} />}
      />
    </SafeAreaView>
  );
}

function ReservationCard({ reserva, onCancel }) {
  const cancelada = reserva.estado === 'cancelada';
  return (
    <View style={[styles.card, cancelada && styles.cardCancelled]}>
      <View style={styles.cardTop}>
        <View><Text style={styles.date}>{reserva.fecha}</Text><Text style={styles.hour}>{reserva.hora}</Text></View>
        <View style={[styles.status, cancelada ? styles.statusCancelled : styles.statusPending]}><Text style={[styles.statusText, cancelada && styles.statusTextCancelled]}>{cancelada ? 'CANCELADA' : 'PENDIENTE'}</Text></View>
      </View>
      <View style={styles.divider} />
      <View style={styles.detailRow}><Text style={styles.detailLabel}>MESA</Text><Text style={styles.detailValue}>{reserva.personas} {reserva.personas === 1 ? 'persona' : 'personas'}</Text></View>
      {reserva.plato ? <View style={styles.detailRow}><Text style={styles.detailLabel}>PLATO</Text><Text style={styles.detailValue}>{reserva.plato}</Text></View> : null}
      {reserva.nota ? <View style={styles.detailRow}><Text style={styles.detailLabel}>DETALLE</Text><Text style={styles.detailValue}>{reserva.nota}</Text></View> : null}
      {reserva.foto_uri ? <Image source={{ uri: reserva.foto_uri }} style={styles.reservationPhoto} /> : null}
      {!cancelada && <Pressable style={styles.cancelButton} onPress={onCancel}><Text style={styles.cancelText}>Cancelar reserva</Text></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 35, flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 5, marginBottom: 20 },
  kicker: { color: colors.caramelLight, fontSize: 10, letterSpacing: 1.8, fontWeight: '800' },
  title: { color: colors.cream, fontSize: 30, fontWeight: '800', marginTop: 6 },
  counter: { color: colors.muted, fontSize: 9, letterSpacing: 1, fontWeight: '800', marginBottom: 3 },
  newReservation: { backgroundColor: colors.caramel, minHeight: 52, borderRadius: 13, paddingHorizontal: 17, marginBottom: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newReservationText: { color: colors.black, fontSize: 14, fontWeight: '800' },
  newReservationArrow: { color: colors.black, fontSize: 21, fontWeight: '800' },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 17, padding: 17, marginBottom: 13 },
  cardCancelled: { opacity: 0.62 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  date: { color: colors.cream, fontSize: 18, fontWeight: '800' },
  hour: { color: colors.caramelLight, fontSize: 14, fontWeight: '700', marginTop: 4 },
  status: { borderRadius: 30, paddingHorizontal: 9, paddingVertical: 6 },
  statusPending: { backgroundColor: '#44321F' },
  statusCancelled: { backgroundColor: '#442624' },
  statusText: { color: colors.caramelLight, fontSize: 9, letterSpacing: 0.8, fontWeight: '800' },
  statusTextCancelled: { color: colors.danger },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 14 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, marginBottom: 8 },
  detailLabel: { color: colors.muted, fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  detailValue: { color: colors.cream, fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  reservationPhoto: { width: '100%', height: 120, borderRadius: 11, marginTop: 8 },
  cancelButton: { alignSelf: 'flex-start', marginTop: 9, paddingVertical: 7 },
  cancelText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 70 },
  emptyTitle: { color: colors.cream, fontSize: 19, fontWeight: '800' },
  emptyText: { color: colors.muted, textAlign: 'center', marginTop: 8, fontSize: 13 },
});
