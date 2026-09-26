import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { guardarReservaLocal, marcarReservaComoSincronizada } from '../database/sqlite';
import { colors } from '../theme';
import { API_URL } from '../api/config';
import { SafeAreaView } from 'react-native-safe-area-context';

const horas = ['12:30', '13:30', '18:30', '19:30', '20:30', '21:30'];
const zonas = ['Salón principal', 'Terraza', 'Bar'];
const titulos = ['Fecha', 'Hora', 'Comensales', 'Detalles', 'Confirmar'];

export default function AgendarReservaScreen({ route, navigation }) {
  const { user, token, platos = [], fotoUri = null } = route.params;
  const platosElegidos = Array.isArray(platos) ? platos : [];
  const resumenPlatos = platosElegidos.length ? platosElegidos.join(', ') : 'Sin productos seleccionados';
  const [paso, setPaso] = useState(1);
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [personas, setPersonas] = useState(2);
  const [zona, setZona] = useState(zonas[0]);
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState(null);

  useEffect(() => {
    if (!fecha || !hora) {
      setDisponibilidad(null);
      return;
    }
    fetch(`${API_URL}/reservas/disponibilidad?fecha=${encodeURIComponent(fecha)}&hora=${encodeURIComponent(hora)}&personas=${personas}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('No se pudo consultar el cupo.')))
      .then(setDisponibilidad)
      .catch(() => setDisponibilidad(null));
  }, [fecha, hora, personas]);

  const continuar = () => {
    if (paso === 1 && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      Alert.alert('Elige una fecha', 'Escríbela en formato AAAA-MM-DD.');
      return;
    }
    if (paso === 2 && !hora) {
      Alert.alert('Elige una hora', 'Selecciona uno de los horarios disponibles.');
      return;
    }
    setPaso((actual) => Math.min(actual + 1, 5));
  };

  const confirmar = async () => {
    if (disponibilidad && !disponibilidad.disponible) {
      Alert.alert('Cupo completo', 'Ya no hay mesa o capacidad disponible para ese horario. Elige otra hora.');
      return;
    }
    setGuardando(true);
    try {
      const nuevaReserva = {
        id: Date.now().toString(),
        usuario_id: user.id,
        fecha,
        hora,
        personas,
        estado: 'pendiente',
        plato: resumenPlatos,
        nota: `${zona}${nota ? ` · ${nota}` : ''}`,
        fotoUri,
      };

      await guardarReservaLocal(nuevaReserva);
      let sincronizado = false;
      if (token && token !== 'offline') {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 65000);
        try {
          const response = await fetch(`${API_URL}/reservas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(nuevaReserva),
            signal: controller.signal,
          });
          const resultado = await response.json();
          if (!response.ok) throw new Error(resultado.mensaje || 'El servidor no pudo guardar la reserva.');
          await marcarReservaComoSincronizada(nuevaReserva.id);
          sincronizado = true;
        } catch (error) {
          console.warn('La reserva quedó pendiente de sincronizar:', error.message);
        } finally {
          clearTimeout(timeout);
        }
      }

      Alert.alert(
        'Reserva confirmada',
        sincronizado
          ? 'Tu mesa quedó guardada y sincronizada con el restaurante.'
          : 'Tu mesa quedó guardada en el dispositivo y se sincronizará cuando haya conexión.',
        [{ text: 'Ver mis reservas', onPress: () => navigation.replace('MisReservas', { user, token }) }]
      );
    } catch (error) {
      console.error('No se pudo guardar la reserva:', error);
      Alert.alert('No se pudo guardar', 'Inténtalo nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  const contenidoPaso = () => {
    if (paso === 1) {
      return <>
        <Text style={styles.title}>¿Qué día nos visitas?</Text>
        <Text style={styles.description}>Reserva con anticipación para tener la mejor mesa disponible.</Text>
        <TextInput
          value={fecha}
          onChangeText={setFecha}
          placeholder="AAAA-MM-DD"
          placeholderTextColor={colors.muted}
          keyboardType="numbers-and-punctuation"
          style={styles.input}
        />
        <Text style={styles.hint}>Ejemplo: 2026-10-15</Text>
      </>;
    }
    if (paso === 2) {
      return <>
        <Text style={styles.title}>Elige el momento</Text>
        <Text style={styles.description}>Todos los horarios están sujetos a confirmación.</Text>
        <View style={styles.chips}>
          {horas.map((item) => <Choice key={item} label={item} selected={hora === item} onPress={() => setHora(item)} />)}
        </View>
      </>;
    }
    if (paso === 3) {
      return <>
        <Text style={styles.title}>¿Cuántas personas?</Text>
        <Text style={styles.description}>Prepararemos una mesa cómoda para todos.</Text>
        <View style={styles.counter}>
          <Pressable style={styles.counterButton} onPress={() => setPersonas((valor) => Math.max(1, valor - 1))}><Text style={styles.counterSymbol}>−</Text></Pressable>
          <View><Text style={styles.counterNumber}>{personas}</Text><Text style={styles.counterLabel}>COMENSALES</Text></View>
          <Pressable style={styles.counterButton} onPress={() => setPersonas((valor) => Math.min(12, valor + 1))}><Text style={styles.counterSymbol}>＋</Text></Pressable>
        </View>
        <Text style={styles.hint}>Para grupos de más de 12 personas, contáctanos directamente.</Text>
        {disponibilidad && <Text style={[styles.availability, !disponibilidad.disponible && styles.availabilityFull]}>{disponibilidad.disponible ? `Hay ${disponibilidad.mesasDisponibles} mesas y ${disponibilidad.cupoDisponible} lugares disponibles.` : 'Este horario ya completo el cupo máximo.'}</Text>}
      </>;
    }
    if (paso === 4) {
      return <>
        <Text style={styles.title}>Personaliza tu visita</Text>
        <Text style={styles.description}>Cuéntanos cómo quieres disfrutar tu mesa.</Text>
        <Text style={styles.fieldLabel}>AMBIENTE PREFERIDO</Text>
        <View style={styles.chips}>
          {zonas.map((item) => <Choice key={item} label={item} selected={zona === item} onPress={() => setZona(item)} />)}
        </View>
        <Text style={[styles.fieldLabel, styles.noteLabel]}>NOTA PARA EL RESTAURANTE</Text>
        <TextInput
          value={nota}
          onChangeText={setNota}
          placeholder="Alergias, celebración o una solicitud especial"
          placeholderTextColor={colors.muted}
          multiline
          maxLength={160}
          style={[styles.input, styles.noteInput]}
        />
        {fotoUri && <View style={styles.photoRow}><Image source={{ uri: fotoUri }} style={styles.photo} /><Text style={styles.photoText}>Tu foto se incluirá como referencia.</Text></View>}
      </>;
    }
    return <>
      <Text style={styles.title}>Todo listo.</Text>
      <Text style={styles.description}>Revisa los detalles de tu experiencia Z'eloura.</Text>
      <View style={styles.summary}>
        <Summary label="FECHA" value={fecha} />
        <Summary label="HORA" value={hora} />
        <Summary label="MESA" value={`${personas} ${personas === 1 ? 'persona' : 'personas'} · ${zona}`} />
        <Summary label="PRODUCTOS ELEGIDOS" value={resumenPlatos} />
        {nota ? <Summary label="NOTA" value={nota} /> : null}
      </View>
      {fotoUri && <Image source={{ uri: fotoUri }} style={styles.summaryPhoto} />}
    </>;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}><Text style={styles.kicker}>NUEVA RESERVA</Text><Text style={styles.stepText}>PASO {paso} DE 5</Text></View>
        <View style={styles.progress}>{titulos.map((titulo, index) => <View key={titulo} style={[styles.progressBar, index + 1 <= paso && styles.progressBarActive]} />)}</View>
        <Text style={styles.stepName}>{titulos[paso - 1]}</Text>
        <View style={styles.content}>{contenidoPaso()}</View>
        <View style={styles.footer}>
          {paso > 1 ? <Pressable style={styles.backButton} onPress={() => setPaso((actual) => actual - 1)}><Text style={styles.backText}>Atrás</Text></Pressable> : <View />}
          <Pressable style={[styles.nextButton, guardando && styles.buttonDisabled]} disabled={guardando} onPress={paso === 5 ? confirmar : continuar}>
            <Text style={styles.nextText}>{paso === 5 ? (guardando ? 'Guardando…' : 'Confirmar reserva') : 'Continuar'}</Text>
            <Text style={styles.nextArrow}>→</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Choice({ label, selected, onPress }) {
  return <Pressable onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}><Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text></Pressable>;
}

function Summary({ label, value }) {
  return <View style={styles.summaryRow}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 20, paddingBottom: 28 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  kicker: { color: colors.caramelLight, fontSize: 10, letterSpacing: 2, fontWeight: '800' },
  stepText: { color: colors.muted, fontSize: 10, letterSpacing: 1.2, fontWeight: '700' },
  progress: { flexDirection: 'row', gap: 5, marginTop: 14 },
  progressBar: { flex: 1, height: 4, borderRadius: 3, backgroundColor: colors.surfaceLight },
  progressBarActive: { backgroundColor: colors.caramel },
  stepName: { color: colors.muted, fontSize: 12, marginTop: 10 },
  content: { flex: 1, paddingTop: 45 },
  title: { color: colors.cream, fontSize: 30, fontWeight: '800', lineHeight: 37 },
  description: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 25 },
  input: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 13, color: colors.cream, fontSize: 17, paddingHorizontal: 16, minHeight: 56 },
  hint: { color: colors.muted, fontSize: 11, marginTop: 10 },
  availability: { color: colors.success, fontSize: 12, fontWeight: '700', marginTop: 18 },
  availabilityFull: { color: colors.danger },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  choice: { borderColor: colors.line, borderWidth: 1, backgroundColor: colors.surface, borderRadius: 11, paddingVertical: 13, paddingHorizontal: 15, minWidth: '30%', alignItems: 'center' },
  choiceSelected: { borderColor: colors.caramel, backgroundColor: '#3A2719' },
  choiceText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  choiceTextSelected: { color: colors.caramelLight },
  counter: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 18, padding: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', textAlign: 'center' },
  counterButton: { width: 49, height: 49, borderRadius: 25, borderColor: colors.caramel, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  counterSymbol: { color: colors.caramelLight, fontSize: 26, fontWeight: '400' },
  counterNumber: { color: colors.cream, fontSize: 41, fontWeight: '800', textAlign: 'center' },
  counterLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginTop: 1 },
  fieldLabel: { color: colors.caramelLight, fontSize: 10, letterSpacing: 1.3, fontWeight: '800', marginBottom: 10 },
  noteLabel: { marginTop: 28 },
  noteInput: { minHeight: 105, paddingTop: 15, textAlignVertical: 'top', fontSize: 14 },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 12 },
  photo: { width: 46, height: 46, borderRadius: 10 },
  photoText: { color: colors.muted, fontSize: 12, flex: 1 },
  summary: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  summaryRow: { padding: 15, borderBottomWidth: 1, borderBottomColor: colors.line },
  summaryLabel: { color: colors.caramelLight, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },
  summaryValue: { color: colors.cream, fontSize: 15, fontWeight: '700', marginTop: 5 },
  summaryPhoto: { height: 140, borderRadius: 14, marginTop: 16 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 35 },
  backButton: { paddingVertical: 15, paddingHorizontal: 8 },
  backText: { color: colors.muted, fontSize: 14, fontWeight: '800' },
  nextButton: { backgroundColor: colors.caramel, minWidth: 170, minHeight: 53, borderRadius: 13, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttonDisabled: { opacity: 0.55 },
  nextText: { color: colors.black, fontSize: 14, fontWeight: '800' },
  nextArrow: { color: colors.black, fontSize: 21, fontWeight: '800' },
});
