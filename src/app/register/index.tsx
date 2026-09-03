import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    useWindowDimensions
} from 'react-native';

import { useRouter } from 'expo-router';

import { registerUser } from '../../api/register';
import { Footer } from '../../components/Footer';
import { colors } from '../../constants/colors';

export default function Register() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const scale = Math.max(
    0.65,
    Math.min(1, (height - 100) / 744),
  );

  const styles = createStyles(scale, width);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    setError('');

    if (!name.trim() || !age.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Preencha todos os campos para continuar.');
      return;
    }

    const numericAge = parseInt(age, 10);
    if (isNaN(numericAge) || numericAge <= 0) {
      setError('Informe uma idade válida.');
      return;
    }

    try {
      setLoading(true);

      const response = await registerUser({
        name: name.trim(),
        age: numericAge,
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

      console.log('CADASTRO REALIZADO COM SUCESSO!');
      console.log('Mensagem:', response.message);
      console.log('Usuário:', response.user);

      // Redireciona para o login após cadastrar com sucesso
      router.push('/login');

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível realizar o cadastro.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        

        {/* RODAPÉ */}
        <Footer />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(scale: number, width: number) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'space-between',
    },
    main: {
      width: '100%',
      paddingHorizontal: Math.min(width * 0.055, 24),
      paddingTop: 10 * scale,
      paddingBottom: 20 * scale,
    },
    topDecoration: {
      position: 'absolute',
      right: -65 * scale,
      top: 15 * scale,
      opacity: 0.3,
    },
    logoContainer: {
      alignItems: 'center',
    },
    logo: {
      color: colors.primary,
      fontSize: 40 * scale,
      fontWeight: '800',
      fontStyle: 'italic',
      letterSpacing: -2,
      marginTop: -4 * scale,
    },
    slogan: {
      color: '#64748B',
      fontSize: 11.5 * scale,
      fontWeight: '500',
      letterSpacing: 0.3,
      marginTop: 1,
    },
    form: {
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
      marginTop: 15 * scale,
    },
    label: {
      color: colors.darkBlue,
      fontSize: 13 * scale,
      fontWeight: '600',
      marginTop: 10 * scale,
      marginBottom: 5 * scale,
    },
    passwordLabelContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    errorText: {
      color: '#DC2626',
      fontSize: 11 * scale,
      marginTop: 6 * scale,
    },
    loginContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 16 * scale,
    },
    loginText: {
      color: '#64748B',
      fontSize: 12 * scale,
    },
    loginLink: {
      color: colors.primary,
      fontSize: 12 * scale,
      fontWeight: '600',
      marginLeft: 5 * scale,
    },
  });
}