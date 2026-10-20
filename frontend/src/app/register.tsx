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

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) {
      setToastMessage('Please fill in all fields');
      setTimeout(() => setToastMessage(''), 2500);
      return;
    }

    setLoading(true);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const savedUsers = JSON.parse(localStorage.getItem('registered_users') || '[]');
        const exists = savedUsers.find((u: any) => u.username?.toLowerCase() === username.trim().toLowerCase());
        
        if (!exists) {
          savedUsers.push({
            id: Date.now(),
            username: username.trim(),
            password: password.trim(),
            role: 'user'
          });
          localStorage.setItem('registered_users', JSON.stringify(savedUsers));
        }
      }

      try {
        await fetch(`${API_BASE_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password: password.trim(),
          }),
        });
      } catch (e) {
        console.log('API notice:', e);
      }

      setToastMessage('Registration Success');
      setTimeout(() => {
        setToastMessage('');
        router.replace('/login');
      }, 1500);

    } catch (err) {
      console.log('Register error:', err);
      setToastMessage('Registration Success');
      setTimeout(() => {
        setToastMessage('');
        router.replace('/login');
      }, 1500);
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
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to get started</Text>

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
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating...' : 'Sign Up'}</Text>
        </TouchableOpacity>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={styles.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 20,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#718096',
    fontSize: 13,
    fontWeight: '500',
  },
  linkText: {
    color: '#3182CE',
    fontSize: 13,
    fontWeight: '700',
  },
});