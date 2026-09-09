import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { registerUser } from '../../api/register';
import { Button } from '../../components/Button';
import { Footer } from '../../components/Footer';
import { Header } from '../../components/Header';
import { Input } from '../../components/Input';
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    setError('');

    // Validação de campos vazios
    if (
      !name.trim() ||
      !age.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('Preencha todos os campos para continuar.');
      return;
    }

    // Validação de Idade
    const numericAge = parseInt(age, 10);
    if (isNaN(numericAge) || numericAge <= 0) {
      setError('Informe uma idade válida.');
      return;
    }

    // Validação de confirmação de senha
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      setLoading(true);

      // O payload enviado para a API permanece intacto, sem confirmPassword
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
        <View style={styles.main}>

          {/* DECORAÇÃO SUPERIOR */}
          <View style={styles.topDecoration}>
            <Ionicons
              name="flame"
              size={140 * scale}
              color={colors.softBlue}
            />
          </View>

          {/* LOGO */}
          <View style={styles.logoContainer}>
            <Ionicons
              name="flame"
              size={58 * scale}
              color={colors.primary}
            />
            <Text style={styles.logo}>IGNIS</Text>
            <Text style={styles.slogan}>FOCO QUE TRANSFORMA</Text>
          </View>

          {/* CABEÇALHO */}
          <Header
            title="Crie sua conta"
            subtitle="Preencha seus dados para começar."
          />

          {/* FORMULÁRIO */}
          <View style={styles.form}>

            {/* NOME */}
            <Text style={styles.label}>Nome Completo</Text>
            <Input
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              autoCapitalize="words"
            />

            {/* IDADE */}
            <Text style={styles.label}>Idade</Text>
            <Input
              value={age}
              onChangeText={setAge}
              placeholder="Ex: 25"
              keyboardType="numeric"
            />

            {/* E-MAIL */}
            <Text style={styles.label}>E-mail</Text>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="seuemail@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* TELEFONE */}
            <Text style={styles.label}>Telefone</Text>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="(00) 00000-0000"
              keyboardType="phone-pad"
            />

            {/* SENHA */}
            <View style={styles.passwordLabelContainer}>
              <Text style={styles.label}>Senha</Text>
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={10}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20 * scale}
                  color="#94A3B8"
                />
              </Pressable>
            </View>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="**********"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />

            {/* CONFIRMAR SENHA */}
            <View style={styles.passwordLabelContainer}>
              <Text style={styles.label}>Confirmar senha</Text>
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={10}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20 * scale}
                  color="#94A3B8"
                />
              </Pressable>
            </View>
            <Input
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="**********"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />

            {/* MENSAGEM DE ERRO */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* BOTÃO CADASTRAR */}
            <Button
              title="Cadastrar"
              onPress={handleRegister}
              loading={loading}
              icon={
                <Ionicons
                  name="checkmark-circle-outline"
                  size={25 * scale}
                  color="#FFFFFF"
                />
              }
              style={{ height: 51 * scale, marginTop: 16 * scale }}
              textStyle={{ fontSize: 17 * scale, fontWeight: '700' }}
            />

            {/* NAVEGAÇÃO PARA LOGIN */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Já possui uma conta?</Text>
              <Pressable onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Fazer login</Text>
              </Pressable>
            </View>

          </View>
        </View>

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