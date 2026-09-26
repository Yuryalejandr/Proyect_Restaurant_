import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { API_URL, warmUpBackend } from '../api/config';
import { guardarSesionLocal } from '../database/sqlite';
import { colors } from '../theme';

export default function RegisterScreen({ navigation }) {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [estadoCarga, setEstadoCarga] = useState('');

  useEffect(() => {
    warmUpBackend().catch(() => {});
  }, []);

  const handleRegister = async () => {
    if (!nombre.trim() || !correo.trim() || !password) {
      Alert.alert('Faltan datos', 'Completa todos los campos para crear tu cuenta.');
      return;
    }

    setCargando(true);
    setEstadoCarga('Conectando con el restaurante…');
    let requestTimeout;
    try {
      await warmUpBackend();
      setEstadoCarga('Creando tu cuenta…');
      const controller = new AbortController();
      requestTimeout = setTimeout(() => controller.abort(), 45000);
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), email: correo.trim(), password }),
        signal: controller.signal,
      });
      clearTimeout(requestTimeout);
      requestTimeout = undefined;
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        Alert.alert('Servidor sin actualizar', `El backend respondió HTTP ${response.status} sin datos válidos. Reinícialo desde la carpeta backend.`);
        return;
      }

      if (!response.ok) {
        Alert.alert('No pudimos crear tu cuenta', data.mensaje || data.error || 'Inténtalo nuevamente.');
        return;
      }

      if (!data.token || !data.user) {
        Alert.alert('Backend sin actualizar', 'Publica los cambios del backend en Render antes de registrar una cuenta.');
        return;
      }

      const passwordHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);
      await guardarSesionLocal(data.user, data.token, passwordHash);
      navigation.reset({ index: 0, routes: [{ name: 'Inicio', params: { user: data.user, token: data.token } }] });
    } catch (error) {
      console.error(error);
      if (error.name === 'AbortError') {
        Alert.alert('El servidor está tardando', 'La solicitud superó el tiempo de espera. Espera unos segundos y vuelve a intentarlo.');
      } else {
        Alert.alert('Sin conexión', `No se pudo conectar con el restaurante en ${API_URL}. Comprueba tu conexión a internet e inténtalo de nuevo.`);
      }
    } finally {
      clearTimeout(requestTimeout);
      setCargando(false);
      setEstadoCarga('');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.brand}><Text style={styles.kicker}>RESTAURANTE</Text><Text style={styles.logo}>Z'eloura</Text></View>
      <View style={styles.form}>
        <Text style={styles.title}>Crea tu cuenta</Text>
        <Text style={styles.subtitle}>Una mesa especial está a unos pasos de distancia.</Text>
        <Text style={styles.label}>NOMBRE COMPLETO</Text>
        <TextInput style={styles.input} placeholder="Tu nombre" placeholderTextColor={colors.muted} value={nombre} onChangeText={setNombre} />
        <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
        <TextInput style={styles.input} placeholder="nombre@correo.com" placeholderTextColor={colors.muted} keyboardType="email-address" autoCapitalize="none" value={correo} onChangeText={setCorreo} />
        <Text style={styles.label}>CONTRASEÑA</Text>
        <TextInput style={styles.input} placeholder="Crea una contraseña" placeholderTextColor={colors.muted} secureTextEntry value={password} onChangeText={setPassword} />
        <Pressable style={[styles.button, cargando && styles.buttonDisabled]} disabled={cargando} onPress={handleRegister}><Text style={styles.buttonText}>{cargando ? estadoCarga : 'Crear cuenta'}</Text><Text style={styles.arrow}>→</Text></Pressable>
      </View>
      <Pressable style={styles.linkButton} onPress={() => navigation.navigate('Login')}><Text style={styles.linkText}>¿Ya tienes cuenta? <Text style={styles.linkStrong}>Inicia sesión</Text></Text></Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: 'center' },
  brand: { marginBottom: 29 },
  kicker: { color: colors.caramelLight, letterSpacing: 3, fontSize: 10, fontWeight: '800' },
  logo: { color: colors.cream, fontSize: 40, fontWeight: '800', marginTop: 4, letterSpacing: -1 },
  form: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 20 },
  title: { color: colors.cream, fontSize: 22, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 15 },
  label: { color: colors.caramelLight, fontSize: 10, letterSpacing: 1.3, fontWeight: '800', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: colors.background, borderColor: colors.line, borderWidth: 1, borderRadius: 11, color: colors.cream, minHeight: 48, paddingHorizontal: 14, fontSize: 14 },
  button: { backgroundColor: colors.caramel, borderRadius: 12, minHeight: 51, paddingHorizontal: 17, marginTop: 23, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: colors.black, fontSize: 15, fontWeight: '800' },
  arrow: { color: colors.black, fontSize: 22, fontWeight: '800' },
  linkButton: { alignItems: 'center', paddingTop: 22 },
  linkText: { color: colors.muted, fontSize: 13 },
  linkStrong: { color: colors.caramelLight, fontWeight: '800' },
});
