import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';

import { FontAwesome, Ionicons } from '@expo/vector-icons';

import { colors } from '../constants/colors';
import { loginUser } from '../services/auth';

export default function Login() {
  const { width, height } = useWindowDimensions();

  /*
   * Altura disponível para o conteúdo.
   * Faz a interface se adaptar a telas pequenas.
   */
  const scale = Math.max(
    0.65,
    Math.min(1, (height - 100) / 744),
  );

  const styles = createStyles(scale, width, height);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

 async function handleLogin() {
  setError('');

  if (!email.trim() || !password) {
    setError('Preencha seu e-mail e sua senha.');
    return;
  }

  try {
    setLoading(true);

    const response = await loginUser({
      email: email.trim(),
      password,
    });

    console.log('LOGIN REALIZADO!');
    console.log('Usuário:', response.user);
    console.log('Token:', response.accessToken);

  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Não foi possível fazer login.',
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
      {/* ÁREA PRINCIPAL */}
      <View style={styles.main}>

        {/* Decoração superior */}
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

          <Text style={styles.logo}>
            IGNIS
          </Text>

          <Text style={styles.slogan}>
            FOCO QUE TRANSFORMA
          </Text>
        </View>

        {/* CABEÇALHO */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Bem-vindo{' '}
            <Text style={styles.titleBlue}>
              de volta!
            </Text>
          </Text>

          <Text style={styles.subtitle}>
            Entre com sua conta para continuar.
          </Text>
        </View>

        {/* FORMULÁRIO */}
        <View style={styles.form}>

          {/* E-MAIL */}
          <Text style={styles.label}>
            E-mail
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={21 * scale}
              color="#94A3B8"
            />

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="seuemail@email.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          {/* SENHA */}
          <Text style={styles.passwordLabel}>
            Senha
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={21 * scale}
              color="#94A3B8"
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="**********"
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.input}
            />

            <Pressable
              onPress={() =>
                setShowPassword(!showPassword)
              }
              hitSlop={10}
            >
              <Ionicons
                name={
                  showPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                }
                size={22 * scale}
                color="#94A3B8"
              />
            </Pressable>
          </View>

          {/* ESQUECI SENHA */}
          <Pressable
            style={styles.forgotContainer}
            onPress={() => {}}
          >
            <Text style={styles.forgotText}>
              Esqueci minha senha
            </Text>
          </Pressable>

          {/* ERRO */}
          {error ? (
            <Text style={styles.errorText}>
              {error}
            </Text>
          ) : null}

          {/* ENTRAR */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.buttonPressed,
              loading && styles.buttonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>
                  Entrar
                </Text>

                <Ionicons
                  name="arrow-forward"
                  size={25 * scale}
                  color="#FFFFFF"
                />
              </>
            )}
          </Pressable>

          {/* OU */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />

            <Text style={styles.orText}>
              ou
            </Text>

            <View style={styles.divider} />
          </View>

          {/* GOOGLE */}
          <Pressable
            style={styles.socialButton}
            onPress={() => {}}
          >
            <FontAwesome
              name="google"
              size={19 * scale}
              color="#4285F4"
            />

            <Text style={styles.socialText}>
              Entrar com Google
            </Text>
          </Pressable>

          {/* APPLE */}
          <Pressable
            style={styles.socialButton}
            onPress={() => {}}
          >
            <Ionicons
              name="logo-apple"
              size={22 * scale}
              color="#000000"
            />

            <Text style={styles.socialText}>
              Entrar com Apple
            </Text>
          </Pressable>

          {/* CRIAR CONTA */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>
              Ainda não tem uma conta?
            </Text>

            <Pressable onPress={() => {}}>
              <Text style={styles.registerLink}>
                Criar conta
              </Text>
            </Pressable>
          </View>

        </View>
      </View>

      {/* RODAPÉ */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Ao continuar, você concorda com nossos
        </Text>

        <Text style={styles.footerBold}>
          Termos de Uso e Política de Privacidade
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function createStyles(
  scale: number,
  width: number,
  height: number,
) {
  return StyleSheet.create({

    /*
     * TELA
     */
    screen: {
      flex: 1,
      width: '100%',
      height: '100%',
      backgroundColor: '#FFFFFF',
      overflow: 'hidden',
    },

    /*
     * ÁREA PRINCIPAL
     */
    main: {
      flex: 1,
      width: '100%',
      paddingHorizontal: Math.min(width * 0.055, 24),
      paddingTop: 10 * scale,
      justifyContent: 'space-between',
      overflow: 'hidden',
    },

    /*
     * DECORAÇÃO
     */
    topDecoration: {
      position: 'absolute',
      right: -65 * scale,
      top: 15 * scale,
      opacity: 0.3,
    },

    /*
     * LOGO
     */
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

    /*
     * CABEÇALHO
     */
    header: {
      width: '100%',
      alignItems: 'center',
      marginTop: 7 * scale,
    },

    title: {
      color: colors.darkBlue,
      fontSize: 23 * scale,
      fontWeight: '700',
      textAlign: 'center',
    },

    titleBlue: {
      color: colors.primary,
    },

    subtitle: {
      color: '#64748B',
      fontSize: 13 * scale,
      marginTop: 4 * scale,
      textAlign: 'center',
    },

    /*
     * FORMULÁRIO
     */
    form: {
  width: '100%',
  marginTop: 7 * scale,

  // Move somente o formulário para cima
  transform: [
    {
      translateY: -18 * scale,
    },
  ],
},

    label: {
      color: colors.darkBlue,
      fontSize: 13 * scale,
      fontWeight: '600',
      marginBottom: 5 * scale,
    },

    passwordLabel: {
      color: colors.darkBlue,
      fontSize: 13 * scale,
      fontWeight: '600',
      marginTop: 10 * scale,
      marginBottom: 5 * scale,
    },

    /*
     * INPUT
     */
    inputContainer: {
      width: '100%',
      height: 47 * scale,
      borderWidth: 1.5,
      borderColor: '#DCE3EF',
      borderRadius: 12 * scale,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12 * scale,
      backgroundColor: '#FFFFFF',
    },

    input: {
      flex: 1,
      marginLeft: 8 * scale,
      color: colors.darkBlue,
      fontSize: 13 * scale,
    },

    /*
     * ESQUECI SENHA
     */
    forgotContainer: {
      alignItems: 'flex-end',
      marginTop: 6 * scale,
    },

    forgotText: {
      color: colors.primary,
      fontSize: 12 * scale,
      fontWeight: '600',
    },

    /*
     * ERRO
     */
    errorText: {
      color: '#DC2626',
      fontSize: 11 * scale,
      marginTop: 4 * scale,
    },

    /*
     * LOGIN
     */
    loginButton: {
      width: '100%',
      height: 51 * scale,
      borderRadius: 12 * scale,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8 * scale,
      marginTop: 13 * scale,
    },

    loginButtonText: {
      color: '#FFFFFF',
      fontSize: 17 * scale,
      fontWeight: '700',
    },

    buttonPressed: {
      opacity: 0.8,
    },

    buttonDisabled: {
      opacity: 0.6,
    },

    /*
     * DIVISOR
     */
    dividerContainer: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 10 * scale,
    },

    divider: {
      flex: 1,
      height: 1,
      backgroundColor: '#DCE3EF',
    },

    orText: {
      color: '#64748B',
      fontSize: 12 * scale,
      marginHorizontal: 12 * scale,
    },

    /*
     * GOOGLE / APPLE
     */
    socialButton: {
      width: '100%',
      height: 47 * scale,
      borderWidth: 1.5,
      borderColor: '#DCE3EF',
      borderRadius: 12 * scale,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14 * scale,
      marginBottom: 7 * scale,
      backgroundColor: '#FFFFFF',
    },

    socialText: {
      color: colors.darkBlue,
      fontSize: 13 * scale,
      fontWeight: '600',
    },

    /*
     * CRIAR CONTA
     */
    registerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 3 * scale,
    },

    registerText: {
      color: '#64748B',
      fontSize: 12 * scale,
    },

    registerLink: {
      color: colors.primary,
      fontSize: 12 * scale,
      fontWeight: '600',
      marginLeft: 5 * scale,
    },

    /*
     * RODAPÉ
     */
    footer: {
      width: '100%',
      height: Math.max(92, height * 0.14),
      backgroundColor: colors.primary,
      borderTopLeftRadius: 75 * scale,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20 * scale,
      flexShrink: 0,
    },

    footerText: {
      color: '#FFFFFF',
      fontSize: 11 * scale,
      textAlign: 'center',
      marginBottom: 3 * scale,
    },

    footerBold: {
      color: '#FFFFFF',
      fontSize: 11 * scale,
      fontWeight: '700',
      textAlign: 'center',
    },
  });
}