import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const API_BASE_URL = 'http://119.59.102.161:3085/api';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setToastMessage('Please fill in all fields');
      setTimeout(() => setToastMessage(''), 2500);
      return;
    }

    setLoading(true);
    try {
      const cleanUsername = username.trim().toLowerCase();

      // ดึงข้อมูลผู้ใช้ทั้งหมดจาก Server API (ที่เชื่อมกับ MySQL/phpMyAdmin)
      const response = await fetch(`${API_BASE_URL}/users`);
      const data = await response.json();

      if (!Array.isArray(data)) {
        setToastMessage('Cannot connect to database users');
        setTimeout(() => setToastMessage(''), 2500);
        setLoading(false);
        return;
      }

      // ค้นหา User ในฐานข้อมูล
      const foundUser = data.find(
        (u: any) => u.username?.toLowerCase() === cleanUsername
      );

      if (!foundUser) {
        setToastMessage('User not found');
        setTimeout(() => setToastMessage(''), 2500);
        setLoading(false);
        return;
      }

      // ตรวจสอบรหัสผ่าน (รองรับฟิลด์ password หรือ pwd)
      const validPassword = foundUser.password ?? foundUser.pass ?? foundUser.pwd;

      if (validPassword !== undefined && String(validPassword) === password.trim()) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          localStorage.setItem('user_role', foundUser.role || 'user');
          localStorage.setItem('username', foundUser.username);
        }
        setToastMessage('Login Successful !');
        setTimeout(() => {
          setToastMessage('');
          router.replace('/');
        }, 1000);
      } else {
        setToastMessage('Incorrect password');
        setTimeout(() => setToastMessage(''), 2500);
      }

    } catch (err) {
      console.log('Login error:', err);
      setToastMessage('Authentication failed');
      setTimeout(() => setToastMessage(''), 2500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {toastMessage !== '' && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.title}>IEM boii</Text>
        <Text style={styles.subtitle}>Sign in to your store system</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your username"
            placeholderTextColor="#A0AEC0"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#A0AEC0"
            secureTextEntry={true}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          activeOpacity={0.8}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.8}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.secondaryButtonText}>Create Account (Sign Up)</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  toastContainer: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    backgroundColor: '#2D3748',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    zIndex: 999,
  },
  toastText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    borderWidth: 1.5,
    borderColor: '#EDF2F7',
    shadowColor: '#CBD5E0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2D3748',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4A5568',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: '500',
    color: '#2D3748',
  },
  button: {
    backgroundColor: '#3182CE',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
    shadowColor: '#3182CE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: '#EDF2F7',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '700',
  },
});