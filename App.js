import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  FlatList,
  Image
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';
import { GoogleGenAI } from '@google/genai';

//⚠️ ATENÇÃO: EM UMA APLICAÇÃO REAL, ESTE VALOR SERÁ CONFIGURADO VIA VARIÁVEL DE AMBIENTE
// 🛑 SUBSTITUA 'CHAVE_API_GEMINI_AQUI' PELA SUA CHAVE API REAL 
const GEMINI_API_KEY = 'CHAVE_API_GEMINI_AQUI';
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const TIPOS_SANGUINEOS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
// --- DADOS MOCKADOS ---
const estados = [
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
];
const cidadesPorEstado = {
  SP: ['São Paulo', 'Campinas', 'Santos'],
  RJ: ['Rio de Janeiro', 'Niterói', 'Duque de Caxias'],
};
const medicosData = [
  {
    id: 'm1',
    nome: 'Dr. João Silva',
    especialidade: 'Cardiologia',
    localidade: { estado: 'SP', cidade: 'São Paulo' },
  },
  {
    id: 'm2',
    nome: 'Dra. Ana Costa',
    especialidade: 'Dermatologia',
    localidade: { estado: 'SP', cidade: 'São Paulo' },
  },
  {
    id: 'm3',
    nome: 'Dr. Pedro Santos',
    especialidade: 'Pediatria',
    localidade: { estado: 'SP', cidade: 'Campinas' },
  },
  {
    id: 'm4',
    nome: 'Dra. Lucia Melo',
    especialidade: 'Ginecologia',
    localidade: { estado: 'RJ', cidade: 'Rio de Janeiro' },
  },
  {
    id: 'm5',
    nome: 'Dr. Ricardo Alves',
    especialidade: 'Cardiologia',
    localidade: { estado: 'RJ', cidade: 'Rio de Janeiro' },
  },
  {
    id: 'm6',
    nome: 'Dr. Felipe Nunes',
    especialidade: 'Oftalmologia',
    localidade: { estado: 'RJ', cidade: 'Niterói' },
  },
];
const getBaseDisponibilidade = (medicoId) => {
  const hoje = new Date();
  const formatarData = (d) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(
      d.getMonth() + 1
    ).padStart(2, '0')}/${d.getFullYear()}`;
  const datas = [
    formatarData(new Date(hoje.getTime() + 86400000)), // Amanhã
    formatarData(new Date(hoje.getTime() + 4 * 86400000)), // Daqui 4 dias
  ];
  if (medicoId === 'm1' || medicoId === 'm5') {
    return {
      [datas[0]]: ['08:00', '09:30', '11:00'],
      [datas[1]]: ['14:00', '15:30'],
    };
  } else if (medicoId === 'm2' || medicoId === 'm4') {
    return {
      [datas[0]]: ['10:00', '16:00'],
    };
  } else {
    return {
      [datas[1]]: ['09:00', '13:00', '17:00'],
    };
  }
};
// --- FIM DADOS MOCKADOS ---

// --- FUNÇÕES DE VALIDAÇÃO ---
const validateBirthDate = (dateString) => {
  if (dateString.length !== 10) return false;
  const parts = dateString.split('/');
  if (parts.length !== 3) return false;

  const [dayStr, monthStr, yearStr] = parts;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) return false;

  if (year < 1900) return false;
  return true;
};


const LoginScreen = ({ onNavigate, onAuthSuccess, registeredUsers }) => {
  const [email, setEmail] = useState('user@teste.com');
  const [password, setPassword] = useState('123456');

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha email e senha.');
      return;
    }

    // Procura o usuário na lista de registrados
    const userFound = registeredUsers.find(
      (u) => u.email === email && u.password === password
    );
    if (userFound) {
      Alert.alert('Sucesso', 'Login realizado com sucesso!');
      const { password, ...userData } = userFound;
      onAuthSuccess(userData);
    } else {
      Alert.alert(
        'Erro',
        'Email ou senha incorretos, ou conta não cadastrada.'
      );
    }
  };

  return (
    <View style={styles.authContainer}>
      <Text style={styles.logo}>HealthConnect</Text>
      <TextInput
        style={styles.authInput}
        placeholder="Email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.authInput}
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.authButton} onPress={handleLogin}>
        <Text style={styles.authButtonText}>Entrar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onNavigate('SignUp')}>
        <Text style={styles.authLink}>Não tem conta? Criar conta</Text>
      </TouchableOpacity>
    </View>
  );
};

const SignUpScreen = ({ onNavigate, onAuthSuccess, setRegisteredUsers }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [bloodType, setBloodType] = useState('');

  // Função para formatar a data enquanto digita (DD/MM/AAAA)
  const handleDateChange = (text) => {
    // Remove tudo que não for número
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 2) {
      cleaned = cleaned.substring(0, 2) + '/' + cleaned.substring(2);
    }
    if (cleaned.length > 5) {
      cleaned = cleaned.substring(0, 5) + '/' + cleaned.substring(5, 9);
    }
    // Limita a 10 caracteres (DD/MM/AAAA)
    if (cleaned.length > 10) {
      cleaned = cleaned.substring(0, 10);
    }

    setBirthDate(cleaned);
  };
  const handleSignUp = () => {
    // Validação de campos obrigatórios
    if (!name || !email || !password || !birthDate || !bloodType) {
      Alert.alert(
        'Erro',
        'Por favor, preencha todos os campos, incluindo a data de nascimento e o tipo sanguíneo.'
      );
      return;
    }

    if (!validateBirthDate(birthDate)) {
      Alert.alert(
        'Erro',
        'Data de nascimento inválida. A data deve ser real e não pode ser futura (Use o formato DD/MM/AAAA).'
      );
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      nome: name,
      email: email,
      password: password,
      birthDate: birthDate,
      bloodType: bloodType, // Salva o tipo sanguíneo
    };
    setRegisteredUsers((prev) => [...prev, newUser]);
    Alert.alert('Sucesso', 'Conta criada com sucesso! Você será logado.');

    const { password: _, ...userData } = newUser;
    onAuthSuccess(userData);
  };

  return (
    <View style={styles.authContainer}>
      <Text style={styles.authTitle}>Criar Conta</Text>
      <TextInput
        style={styles.authInput}
        placeholder="Nome"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.authInput}
        placeholder="Email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      <TextInput
        style={[
          styles.authInput,
          // Alerta visual de erro se a data foi digitada e é inválida
          birthDate.length === 10 &&
            !validateBirthDate(birthDate) && {
              borderColor: '#e74c3c',
              borderWidth: 2,
            },
        ]}
        placeholder="Data de Nascimento (DD/MM/AAAA)"
        value={birthDate}
        onChangeText={handleDateChange}
        keyboardType="numeric"
        maxLength={10}
      />

      <Text style={[styles.label, { marginTop: 0, marginBottom: 10 }]}>
        Tipo Sanguíneo (Obrigatório):
      </Text>
      <View style={styles.bloodTypeRow}>
        {TIPOS_SANGUINEOS.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.bloodTypePill,
              bloodType === type && styles.bloodTypePillSelected,
            ]}
            onPress={() => setBloodType(type)}>
            <Text
              style={[
                styles.bloodTypePillText,
                bloodType === type && styles.bloodTypePillTextSelected,
              ]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.authInput}
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.authButton} onPress={handleSignUp}>
        <Text style={styles.authButtonText}>Cadastrar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onNavigate('Login')}>
        <Text style={styles.authLink}>Já tem conta? Faça login</Text>
      </TouchableOpacity>
    </View>
  );
};
// --- TELAS DO APP ---

const HomeScreen = ({ onNavigate, onLogout }) => {
  const menuItems = [
    {
      id: 'Consultas',
      label: 'Consultas',
      icon: 'calendar',
      iconFamily: 'Feather',
    },
    {
      id: 'Tele-consulta',
      label: 'Tele-consulta',
      icon: 'video',
      iconFamily: 'Feather',
    },
    {
      id: 'Dependentes',
      label: 'Dependentes',
      icon: 'users',
      iconFamily: 'Feather',
    },
    {
      id: 'Documentos',
      label: 'Documentos médicos',
      icon: 'file-text',
      iconFamily: 'Feather',
    },
    {
      id: 'Ajuda',
      label: 'Ajuda',
      icon: 'help-circle',
      iconFamily: 'Feather',
    },

    {
      id: 'Conta',
      label: 'Conta',
      icon: 'user',
      iconFamily: 'Feather',
    },
  ];
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitleApp}>Bem-vindo</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Icon name="logout" size={24} color="#3498DB" />
        </TouchableOpacity>
      </View>
      <ScrollView>
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuButton}
              onPress={() => onNavigate(item.id)}>
              <Feather name={item.icon} size={32} color="#3498DB" />
              <Text style={styles.menuLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
const ConsultasScreen = ({ onBack }) => {
  const [estadoSelecionado, setEstadoSelecionado] = useState(null);
  const [cidadeSelecionada, setCidadeSelecionada] = useState(null);
  const [termoBusca, setTermoBusca] = useState('');
  const [medicoSelecionado, setMedicoSelecionado] = useState(null);
  const [especialidade, setEspecialidade] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horarioSelecionado, setHorarioSelecionado] = useState('');
  const [lembrete, setLembrete] = useState(false);
  const [consultas, setConsultas] = useState([]);
  const [consultaEmEdicao, setConsultaEmEdicao] = useState(null);
  const [disponibilidade, setDisponibilidade] = useState({});

  const filtrarDisponibilidadeOcupada = (
    baseDisponibilidade,
    medicoId,
    consultaSendoEditadaId
  ) => {
    const disponivel = JSON.parse(JSON.stringify(baseDisponibilidade));
    consultas.forEach((consulta) => {
      if (consulta.id === consultaSendoEditadaId) return;

      if (consulta.medicoId === medicoId) {
        const { data, horario } = consulta;
        if (disponivel[data]) {
          disponivel[data] = disponivel[data].filter((h) => h !== horario);
          if (disponivel[data].length === 0) {
            delete disponivel[data];
          }
        }
      }
    });
    return disponivel;
  };

  const getMedicosFiltrados = useMemo(() => {
    let listaFiltrada = medicosData;
    const busca = termoBusca.toLowerCase().trim();

    if (estadoSelecionado && cidadeSelecionada) {
      listaFiltrada = listaFiltrada.filter(
        (m) =>
          m.localidade.estado === estadoSelecionado &&
          m.localidade.cidade === cidadeSelecionada
      );
    } else {
      listaFiltrada = [];
    }

    if (busca.length > 0) {
      listaFiltrada = listaFiltrada.filter(
        (m) =>
          m.nome.toLowerCase().includes(busca) ||
          m.especialidade.toLowerCase().includes(busca)
      );
    }

    return listaFiltrada;
  }, [estadoSelecionado, cidadeSelecionada, termoBusca]);
  const resetForm = () => {
    setMedicoSelecionado(null);
    setEspecialidade('');
    setDataSelecionada('');
    setHorarioSelecionado('');
    setLembrete(false);
    setConsultaEmEdicao(null);
    setDisponibilidade({});
  };
  const handleEstadoChange = (sigla) => {
    setEstadoSelecionado(sigla);
    setCidadeSelecionada(null);
    setTermoBusca('');
    resetForm();
  };
  const handleCidadeChange = (cidade) => {
    setCidadeSelecionada(cidade);
    setTermoBusca('');
    resetForm();
  };
  const handleMedicoChange = (medico) => {
    if (medico.id === medicoSelecionado?.id) {
      setMedicoSelecionado(null);
      setEspecialidade('');
      setDisponibilidade({});
    } else {
      setMedicoSelecionado(medico);
      setEspecialidade(medico.especialidade);
      const baseDisponibilidade = getBaseDisponibilidade(medico.id);
      const disponibilidadeLivre = filtrarDisponibilidadeOcupada(
        baseDisponibilidade,
        medico.id,
        consultaEmEdicao
      );
      setDisponibilidade(disponibilidadeLivre);
    }
    setDataSelecionada('');
    setHorarioSelecionado('');
  };

  const handleSalvarOuAtualizarConsulta = () => {
    if (!medicoSelecionado || !dataSelecionada || !horarioSelecionado) {
      Alert.alert(
        'Erro',
        'Por favor, selecione o Médico, a Data e o Horário disponíveis.'
      );
      return;
    }

    const novoDados = {
      medicoId: medicoSelecionado.id,
      medicoNome: medicoSelecionado.nome,
      especialidade: medicoSelecionado.especialidade,
      localidade: medicoSelecionado.localidade,
      data: dataSelecionada,
      horario: horarioSelecionado,
      lembrete: lembrete,
    };
    if (consultaEmEdicao) {
      setConsultas(
        consultas.map((c) =>
          c.id === consultaEmEdicao ? { id: c.id, ...novoDados } : c
        )
      );
      Alert.alert('Sucesso', 'Consulta reagendada com sucesso!');
    } else {
      const novaConsulta = {
        id: Date.now().toString(),
        ...novoDados,
      };
      setConsultas([novaConsulta, ...consultas]);
      Alert.alert('Sucesso', 'Consulta agendada com sucesso!');
    }

    resetForm();
  };
  const handleStartReagendamento = (consultaId) => {
    const consulta = consultas.find((c) => c.id === consultaId);
    if (consulta) {
      const medicoCompleto = medicosData.find(
        (m) => m.id === consulta.medicoId
      );
      setEstadoSelecionado(consulta.localidade.estado);
      setCidadeSelecionada(consulta.localidade.cidade);
      setMedicoSelecionado(medicoCompleto);
      setEspecialidade(consulta.especialidade);
      setLembrete(consulta.lembrete);

      const baseDisponibilidade = getBaseDisponibilidade(consulta.medicoId);

      const disponibilidadeLivre = filtrarDisponibilidadeOcupada(
        baseDisponibilidade,
        consulta.medicoId,
        consultaId
      );
      setDisponibilidade(disponibilidadeLivre);

      setDataSelecionada('');
      setHorarioSelecionado('');
      setConsultaEmEdicao(consultaId);
    }
  };

  const handleExcluirConsulta = (id) => {
    Alert.alert(
      'Confirmar Cancelamento',
      'Tem certeza de que deseja cancelar esta consulta?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'CANCELAR',
          onPress: () => {
            setConsultas((prevConsultas) =>
              prevConsultas.filter((consulta) => consulta.id !== id)
            );
            if (consultaEmEdicao === id) {
              resetForm();
            }
            Alert.alert('Sucesso', 'Consulta cancelada!');
          },

          style: 'destructive',
        },
      ]
    );
  };

  const renderMedicoItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.pickerItem,
        medicoSelecionado?.id === item.id && styles.pickerItemSelected,
      ]}
      onPress={() => handleMedicoChange(item)}>
      <Text
        style={[
          styles.pickerItemText,
          medicoSelecionado?.id === item.id && styles.pickerItemSelectedText,
        ]}>
        {item.nome}
      </Text>
      <Text
        style={[
          styles.pickerItemSubText,
          medicoSelecionado?.id === item.id && styles.pickerItemSelectedText,
        ]}>
        ({item.especialidade})
      </Text>
    </TouchableOpacity>
  );
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#3498DB" />
        <Text style={styles.backButtonText}>{'Voltar'}</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>
            {consultaEmEdicao ? 'Reagendar Consulta' : 'Agendar Nova Consulta'}
          </Text>

          <Text style={styles.label}>Selecione o Estado:</Text>
          <View style={styles.localidadeRow}>
            {estados.map((est) => (
              <TouchableOpacity
                key={est.sigla}
                style={[
                  styles.localidadePill,
                  estadoSelecionado === est.sigla &&
                    styles.localidadePillSelected,
                ]}
                onPress={() => handleEstadoChange(est.sigla)}>
                <Text
                  style={[
                    styles.localidadePillText,
                    estadoSelecionado === est.sigla &&
                      styles.localidadePillTextSelected,
                  ]}>
                  {est.sigla}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {estadoSelecionado && (
            <>
              <Text style={styles.label}>Selecione a Cidade:</Text>
              <View style={styles.localidadeRow}>
                {cidadesPorEstado[estadoSelecionado]?.map((cidade) => (
                  <TouchableOpacity
                    key={cidade}
                    style={[
                      styles.cidadePill,
                      cidadeSelecionada === cidade &&
                        styles.localidadePillSelected,
                    ]}
                    onPress={() => handleCidadeChange(cidade)}>
                    <Text
                      style={[
                        styles.localidadePillText,
                        cidadeSelecionada === cidade &&
                          styles.localidadePillTextSelected,
                      ]}>
                      {cidade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {estadoSelecionado && cidadeSelecionada && (
            <View style={styles.medicoSelectionBlock}>
              <Text style={styles.label}>Encontre e Selecione o Médico:</Text>

              <TextInput
                style={styles.input}
                value={termoBusca}
                onChangeText={setTermoBusca}
                placeholder="Pesquisar por Nome 
 ou Especialidade..."
              />

              <View style={styles.flatListContainer}>
                {getMedicosFiltrados.length > 0 ? (
                  <FlatList
                    data={getMedicosFiltrados}
                    keyExtractor={(item) => item.id}
                    renderItem={renderMedicoItem}
                    scrollEnabled={false}
                    contentContainerStyle={styles.flatListContent}
                  />
                ) : (
                  <Text style={styles.emptyText}>
                    {termoBusca
                      ? 'Nenhum médico encontrado com este termo.'
                      : 'Nenhum médico disponível no momento.'}
                  </Text>
                )}
              </View>
            </View>
          )}

          {medicoSelecionado && Object.keys(disponibilidade).length > 0 && (
            <View style={styles.availabilityContainer}>
              <Text style={styles.label}>Datas Disponíveis:</Text>
              <View style={styles.datePickerRow}>
                {Object.keys(disponibilidade).map((data) => (
                  <TouchableOpacity
                    key={data}
                    style={[
                      styles.datePill,

                      dataSelecionada === data && styles.datePillSelected,
                    ]}
                    onPress={() => {
                      setDataSelecionada(data);
                      setHorarioSelecionado('');
                    }}>
                    <Text
                      style={[
                        styles.datePillText,
                        dataSelecionada === data && styles.datePillTextSelected,
                      ]}>
                      {data}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {dataSelecionada &&
              disponibilidade[dataSelecionada]?.length > 0 ? (
                <View>
                  <Text style={styles.label}>
                    Horários Disponíveis em {dataSelecionada}:
                  </Text>
                  <View style={styles.timePickerRow}>
                    {disponibilidade[dataSelecionada].map((horario) => (
                      <TouchableOpacity
                        key={horario}
                        style={[
                          styles.timePill,
                          horarioSelecionado === horario &&
                            styles.timePillSelected,
                        ]}
                        onPress={() => setHorarioSelecionado(horario)}>
                        <Text
                          style={[
                            styles.timePillText,

                            horarioSelecionado === horario &&
                              styles.timePillTextSelected,
                          ]}>
                          {horario}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  Sem horários disponíveis para esta data.
                </Text>
              )}
            </View>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.label}>Receber lembrete da consulta:</Text>
            <Switch
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={lembrete ? '#3498db' : '#f4f3f4'}
              ios_backgroundColor="#3e3e3e"
              onValueChange={setLembrete}
              value={lembrete}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[
                styles.button,
                consultaEmEdicao ? styles.updateButton : styles.saveButton,
                (!medicoSelecionado ||
                  !dataSelecionada ||
                  !horarioSelecionado) &&
                  styles.disabledButton,
              ]}
              onPress={handleSalvarOuAtualizarConsulta}
              disabled={
                !medicoSelecionado || !dataSelecionada || !horarioSelecionado
              }>
              <Text style={styles.buttonText}>
                {consultaEmEdicao
                  ? 'CONFIRMAR REAGENDAMENTO'
                  : 'AGENDAR CONSULTA'}
              </Text>
            </TouchableOpacity>

            {consultaEmEdicao && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={resetForm}>
                <Text style={styles.buttonText}>CANCELAR</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>
            Consultas Agendadas ({consultas.length})
          </Text>

          {consultas.length === 0 ? (
            <Text style={styles.emptyText}>
              Nenhuma consulta agendada no momento.
            </Text>
          ) : (
            consultas.map((consulta) => (
              <View key={consulta.id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <View>
                    <Text style={styles.eventDate}>
                      Data: {consulta.data} às {consulta.horario}
                    </Text>

                    <Text style={styles.eventLocation}>
                      {consulta.localidade.cidade}, {consulta.localidade.estado}
                    </Text>
                  </View>
                  <View style={styles.eventActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleStartReagendamento(consulta.id)}>
                      <Text style={styles.actionButtonText}>REAGENDAR</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleExcluirConsulta(consulta.id)}>
                      <Text style={styles.actionButtonText}>CANCELAR</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.eventName}>
                  {consulta.medicoNome} ({consulta.especialidade})
                </Text>

                <Text style={styles.eventObservation}>
                  Lembrete: {consulta.lembrete ? 'SIM' : 'NÃO'}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const TeleconsultaScreen = ({ onBack }) => {
  const [callState, setCallState] = useState('parado');
  const [callTime, setCallTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const intervalRef = useRef(null);

  const formatTime = useCallback((totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (callState === 'ativo' && !intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setCallTime(prevTime => prevTime + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [callState]);

  const toggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const toggleCamera = () => {
    setIsCameraOff(prev => !prev);
  };

  const toggleCall = () => {
    if (callState !== 'parado') {
      setCallState('parado');
      setCallTime(0);
    } else {
      setCallState('conectando');
      setTimeout(() => {
        setCallState('ativo');
      }, 3000);
    }
  };

  const isActive = callState === 'ativo';
  const isConnecting = callState === 'conectando';
  const isCalling = callState !== 'parado';

  const buttonColor = isCalling ? '#E74C3C' : '#2ECC71';
  const callButtonText = isCalling ? 'Desligar' : 'Ligar';

  let statusText = 'Pressione em "Ligar" para iniciar a teleconsulta';
  let doctorName = '';
  let specialty = '';

  if (isConnecting) {
    statusText = 'Aguardando atendimento...';
    doctorName = 'Buscando médico...';
  } else if (isActive) {
    statusText = formatTime(callTime);
    doctorName = 'Dra. Sofia Martins';
    specialty = 'Clínico geral';
  }
  const micIconName = isMuted ? 'mic-off' : 'mic';
  const micColor = isMuted ? '#E74C3C' : '#95A5A6';

  const cameraIconName = isCameraOff ? 'videocam-off' : 'videocam';
  const cameraColor = isCameraOff ? '#E74C3C' : '#95A5A6';

  return (
    <View style={styles.callContainer}>

      <View style={styles.videoContainer}>
        {isActive ? (
          <Image
            source={ require('./src/doutora.jpg')}
            style={styles.remoteVideoImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.remoteVideoPlaceholder} />
        )}
      </View>

      <View style={styles.localCameraPreview}>
        <Icon name="person" size={50} color="#3498DB" />
      </View>

      {callState === 'parado' && (
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'Voltar'}</Text>
        </TouchableOpacity>
      )}

      {isActive ? (
        <View style={[styles.middleContent, styles.callActiveContent]}>
          <View style={styles.infoContainerActive}>
            <Text style={styles.statusText}>{statusText}</Text>
            <Text style={styles.nameText}>{doctorName}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.middleContent}>
          <View style={styles.doctorCircle}>
            <Icon name="person" size={100} color="#fff" />
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.statusText}>{statusText}</Text>
            <Text style={styles.nameText}>{doctorName}</Text>
            {!isConnecting && <Text style={styles.specialtyText}>{specialty}</Text>}
          </View>
        </View>
      )}

      <View style={styles.controlButtonsContainer}>

        {isCalling ? (
          <>
            <TouchableOpacity
              style={[styles.smallControlButton, { backgroundColor: micColor }]}
              onPress={toggleMute}
            >
              <Icon name={micIconName} size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.callButton, { backgroundColor: buttonColor, marginBottom: 0 }]}
              onPress={toggleCall}
            >
              <Icon
                name={'call-end'}
                size={30}
                color="#FFFFFF"
              />
              <Text style={styles.callButtonText}>{callButtonText}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallControlButton, { backgroundColor: cameraColor }]}
              onPress={toggleCamera}
            >
              <Icon name={cameraIconName} size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.callButton, { backgroundColor: buttonColor, marginBottom: 0 }]}
            onPress={toggleCall}
          >
            <Icon
              name={'call'}
              size={30}
              color="#FFFFFF"
            />
            <Text style={styles.callButtonText}>{callButtonText}</Text>
          </TouchableOpacity>
        )}

      </View>

    </View>
  );
};

const DependentesScreen = ({ onBack }) => {
  const initialDependents = [
    { id: '1', nome: 'João da Silva', parentesco: 'Filho(a)', idade: 8 },
    { id: '2', nome: 'Maria da Silva', parentesco: 'Cônjuge', idade: 35 },
    { id: '3', nome: 'Pedro da Silva', parentesco: 'Filho(a)', idade: 5 },
  ];
  const [dependentes, setDependentes] = useState(initialDependents);

  const handleAddDependent = () => {
    Alert.alert('Adicionar Dependente', 'nome, parentesco e idade', [
      { text: 'OK' },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.dependentCard}>
      <View style={styles.infoContainer}>
        <Text style={styles.dependentName}>{item.nome}</Text>
        <Text style={styles.dependentDetails}>
          {item.parentesco} / {item.idade} anos
        </Text>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => Alert.alert('Editar', `Editar ${item.nome}`)}>
        <Icon name="edit" size={20} color="#3498DB" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#3498DB" />
        <Text style={styles.backButtonText}>{'Voltar'}</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Meus Dependentes</Text>

      <TouchableOpacity style={styles.addButton} onPress={handleAddDependent}>
        <Icon name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>ADICIONAR DEPENDENTE</Text>
      </TouchableOpacity>

      <FlatList
        data={dependentes}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>Nenhum dependente cadastrado.</Text>
        )}
      />
    </View>
  );
};

const DocumentosScreen = ({ onBack }) => {
  const documentos = [
    {
      id: 'd1',
      nome: 'Receita de Óculos - 2023',
      tipo: 'Receita',
      data: '15/08/2023',
    },
    {
      id: 'd2',
      nome: 'Exames de Sangue - 01/2024',
      tipo: 'Exame',
      data: '10/01/2024',
    },
    {
      id: 'd3',
      nome: 'Atestado Médico - COVID',
      tipo: 'Atestado',
      data: '20/12/2022',
    },
  ];

  const renderItem = ({ item }) => (
    <View style={styles.documentCard}>
      <Icon name="file-document" size={30} color="#9b59b6" />
      <View style={styles.docInfo}>
        <Text style={styles.documentName}>{item.nome}</Text>
        <Text style={styles.documentDetails}>
          {item.tipo} | Data: {item.data}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.downloadButton}
        onPress={() => Alert.alert('Download', `Baixando ${item.nome}`)}>
        <Icon name="file-download" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#3498DB" />
        <Text style={styles.backButtonText}>{'Voltar'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Meus Documentos</Text>
      <FlatList
        data={documentos}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>Nenhum documento encontrado.</Text>
        )}
      />
    </View>
  );
};

const ErrorScreen = ({ onTryAgain, errorMessage }) => (
  <View style={styles.container}>
    <View style={styles.errorContainer}>
      <Icon name="warning" size={60} color="#e74c3c" />
      <Text style={styles.errorTitle}>Ocorreu um Erro</Text>
      <Text style={styles.errorMessage}>{errorMessage}</Text>
      <TouchableOpacity style={styles.errorButton} onPress={onTryAgain}>
        <Text style={styles.buttonText}>TENTAR NOVAMENTE</Text>
      </TouchableOpacity>
    </View>
  </View>
);


const ChatBotScreen = ({ onBack, onError }) => {
  const [messages, setMessages] = useState([
    {
      id: '0',
      text: 'Olá! Sou seu assistente de saúde virtual. Como posso ajudar hoje?',
      sender: 'ai',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef(null);

  // Componente interno para exibir a bolha da mensagem
  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userBubble : styles.aiBubble,
      ]}>
      <Text
        style={[
          styles.messageText,
          item.sender === 'user' ? styles.userText : styles.aiText,
        ]}>
        {item.text}
      </Text>
    </View>
  );

  const callGeminiAPI = async (userMessageText, currentMessages, onError) => {
    setIsSending(true);
    try {
      // 3. Monta o histórico de conversação para o Gemini (apenas as mensagens de texto)
      const chatHistory = currentMessages
        .filter((msg) => msg.id !== '0')
        .map((msg) => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }));

      // A API do Gemini pode gerar texto com base no histórico
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          // Configurações e contexto inicial
          {
            role: 'system',
            parts: [
              {
                text: `Você é um chatbot assistente de saúde virtual de uma aplicação móvel. Suas respostas devem ser concisas e focadas em ajudar o usuário com informações gerais sobre a aplicação (agendamentos, teleconsultas, documentos, dependentes, etc.) ou dar informações básicas de saúde, SEMPRE enfatizando que você NÃO substitui um médico de verdade e que a API Key para este chat é 'SUA_CHAVE_API_GEMINI_AQUI'.`,
              },
            ],
          },
          ...chatHistory, // Histórico
          // A última mensagem do usuário é a que desencadeia a resposta
        ],
        config: {
          systemInstruction: `Você é um chatbot assistente de saúde virtual de uma aplicação móvel. Suas respostas devem ser concisas e focadas em ajudar o usuário com informações gerais sobre a aplicação (agendamentos, teleconsultas, documentos, dependentes, etc.) ou dar informações básicas de saúde, SEMPRE enfatizando que você NÃO substitui um médico de verdade. Não revele a API Key.`,
          // Adiciona contexto sobre as funcionalidades do app
          tools: [
            {
              functionDeclarations: [
                {
                  name: 'getAppFunctionality',
                  description:
                    'Fornece detalhes sobre as funcionalidades do aplicativo (Consultas, Tele-consulta, Dependentes, Documentos, Conta).',
                  parameters: {
                    type: 'OBJECT',
                    properties: {
                      functionName: {
                        type: 'STRING',
                        description:
                          'O nome da funcionalidade do app que o usuário está perguntando. Ex: Consultas, Dependentes, Documentos.',
                      },
                    },
                  },
                  returns: {
                    type: 'OBJECT',
                    properties: {
                      details: {
                        type: 'STRING',
                        description:
                          'Descrição da funcionalidade do aplicativo.',
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      });

      const responseText = response.text.trim();

      const newAiMessage = {
        id: Date.now().toString() + '_ai',
        text: responseText,
        sender: 'ai',
      };

      setMessages((prevMessages) => [...prevMessages, newAiMessage]);
    } catch (error) {
      console.error('Erro ao chamar a API do Gemini:', error);
      const errorMsg =
        error.message || 'Erro desconhecido ao contatar o assistente virtual.';
      onError(`Erro no ChatBot: Verifique a API Key. Código: ${errorMsg}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => {
    const userMessageText = inputText.trim();
    if (userMessageText === '') return;

    const newMessage = {
      id: Date.now().toString(),
      text: userMessageText,
      sender: 'user',
    };

    // 1. Adiciona a mensagem do usuário imediatamente
    setMessages((prevMessages) => [...prevMessages, newMessage]);

    // Captura o histórico, incluindo a mensagem atual do usuário, antes de limpar o input.
    const messageToSend = [...messages, newMessage];

    setInputText('');

    // 2. Chama a API do Gemini com o histórico atualizado
    callGeminiAPI(userMessageText, messageToSend, onError);
  };

  useEffect(() => {
    // Rola para o final quando novas mensagens chegam
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <View style={styles.chatContainer}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#3498DB" />
        <Text style={styles.backButtonText}>{'Voltar'}</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>💬 Chat com Assistente</Text>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {isSending && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>Digitando...</Text>
        </View>
      )}

      <View style={styles.inputContainerChat}>
        <TextInput
          style={styles.chatInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Digite sua pergunta (Ex: Qual o telefone da clínica?)"
          placeholderTextColor="#95a5a6"
          onSubmitEditing={handleSend}
          editable={!isSending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (inputText.trim() === '' || isSending) && styles.disabledButton,
          ]}
          onPress={handleSend}
          disabled={inputText.trim() === '' || isSending}>
          {isSending ? (
            <Icon name="more-horiz" size={24} color="#FFFFFF" />
          ) : (
            <Icon name="send" size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const AccountScreen = ({ onBack, user }) => {
  // Função para calcular a idade baseada na string "DD/MM/AAAA"
  const calculateAge = (dateString) => {
    if (!dateString) return 'Data não informada';

    const parts = dateString.split('/');
    if (parts.length !== 3) return 'Formato Inválido';

    const [day, month, year] = parts.map(Number);

    const today = new Date();
    const birthDate = new Date(year, month - 1, day);

    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age < 0 ? 'Data futura' : age.toString();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#3498DB" />
        <Text style={styles.backButtonText}>{'Voltar'}</Text>
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Minha Conta (Perfil)</Text>

      <ScrollView style={styles.scrollView}>
        {/* Campo Nome */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Nome:</Text>
          <Text style={styles.infoValue}>{user?.nome || 'N/A'}</Text>
        </View>
        {/* Campo Email */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{user?.email || 'N/A'}</Text>
        </View>
        {/* Campo Data de Nascimento */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Data de Nascimento:</Text>
          <Text style={styles.infoValue}>
            {user?.birthDate || 'Não informada'}
          </Text>
        </View>
        {/* Campo Idade */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Idade:</Text>
          <Text style={styles.infoValue}>{calculateAge(user?.birthDate)}</Text>
        </View>
        {/* Campo NOVO: Tipo Sanguíneo */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Tipo Sanguíneo:</Text>
          <Text style={styles.infoValue}>{user?.bloodType || 'N/A'}</Text>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.authButton,
          styles.cancelButton,
          { marginTop: 20, marginHorizontal: 15 },
        ]}>
        <Text style={styles.authButtonText}>
          ALTERAR SENHA (Não implementado)
        </Text>
      </TouchableOpacity>
    </View>
  );
};
// --- COMPONENTE PRINCIPAL (ROUTER) ---
const App = () => {
  const [telaAtual, setTelaAtual] = useState('Login');
  const [usuarioLogado, setUsuarioLogado] = useState(null);
  const [erro, setErro] = useState(null);

  // MOCK para armazenar usuários cadastrados (email, senha, nome, DATA DE NASCIMENTO, TIPO SANGUÍNEO)
  const [registeredUsers, setRegisteredUsers] = useState([
    // Usuário pré-cadastrado para testes COM TIPO SANGUÍNEO
    {
      email: 'user@teste.com',
      password: '123456',
      nome: 'Usuário Mock',
      birthDate: '01/01/1990',
      bloodType: 'O+', // DADO NOVO
    },
  ]);

  const navegarPara = (tela) => {
    setTelaAtual(tela);
    setErro(null);
  };

  const handleAuthSuccess = (userData) => {
    setUsuarioLogado(userData);
    setTelaAtual('Principal');
  };

  const handleLogout = () => {
    setUsuarioLogado(null);
    setTelaAtual('Login');
  };

  const dispararErro = (mensagem) => {
    setErro(mensagem);
    setTelaAtual('Error');
  };

  const renderContent = () => {
    if (erro) {
      return (
        <ErrorScreen
          errorMessage={erro}
          onTryAgain={() => navegarPara('Principal')}
        />
      );
    }

    switch (telaAtual) {
      case 'Login':
        return (
          <LoginScreen
            onNavigate={navegarPara}
            onAuthSuccess={handleAuthSuccess}
            registeredUsers={registeredUsers}
          />
        );
      case 'SignUp':
        return (
          <SignUpScreen
            onNavigate={navegarPara}
            onAuthSuccess={handleAuthSuccess}
            setRegisteredUsers={setRegisteredUsers}
          />
        );
      case 'Principal':
        return <HomeScreen onNavigate={navegarPara} onLogout={handleLogout} />;
      case 'Consultas':
        return <ConsultasScreen onBack={() => navegarPara('Principal')} />;
      case 'Tele-consulta':
        return <TeleconsultaScreen onBack={() => navegarPara('Principal')} />;
      case 'Dependentes':
        return <DependentesScreen onBack={() => navegarPara('Principal')} />;
      case 'Documentos':
        return <DocumentosScreen onBack={() => navegarPara('Principal')} />;
      case 'Ajuda':
        return (
          <ChatBotScreen
            onBack={() => navegarPara('Principal')}
            onError={dispararErro}
          />
        );
      case 'Conta':
        return (
          <AccountScreen
            user={usuarioLogado}
            onBack={() => navegarPara('Principal')}
          />
        );
      default:
        return <Text>Tela não encontrada</Text>;
    }
  };

  return <View style={styles.appContainer}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  // Estilos Gerais
  appContainer: {
    flex: 1,
    backgroundColor: '#ecf0f1', // Cor de fundo da aplicação
  },
  container: {
    flex: 1,
    paddingTop: 40,
    backgroundColor: '#ecf0f1',
  },
  scrollView: {
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitleApp: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34495e',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  logoutButton: {
    padding: 5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  backButtonText: {
    marginLeft: 5,
    fontSize: 18,
    color: '#3498DB',
  },
  // Estilos Menu (HomeScreen)
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 15,
  },
  menuButton: {
    width: '47%', 
    aspectRatio: 1, 
    backgroundColor: '#fff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#eee',
  },
  menuLabel: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    textAlign: 'center',
  },
  // Estilos para Formulários (Consultas, etc.)
  formContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    marginBottom: 5,
  },
  localidadeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  localidadePill: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3498DB',
  },
  cidadePill: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3498DB',
  },
  localidadePillSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  localidadePillText: {
    color: '#3498DB',
    fontWeight: '600',
  },
  localidadePillTextSelected: {
    color: '#fff',
  },
  medicoSelectionBlock: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  flatListContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  flatListContent: {
    padding: 5,
  },
  pickerItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  pickerItemSelected: {
    backgroundColor: '#e6f0ff',
    borderLeftWidth: 5,
    borderLeftColor: '#3498db',
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
  },
  pickerItemSubText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  // Estilos para Picker de Data/Horário
  availabilityContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  datePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  datePill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#3498DB',
    backgroundColor: '#fff',
  },
  datePillSelected: {
    backgroundColor: '#3498DB',
  },
  datePillText: {
    color: '#3498DB',
    fontWeight: '600',
    fontSize: 12,
  },
  datePillTextSelected: {
    color: '#fff',
  },
  timePickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  timePill: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#2ecc71',
    backgroundColor: '#fff',
  },
  timePillSelected: {
    backgroundColor: '#2ecc71',
  },
  timePillText: {
    color: '#2ecc71',
    fontWeight: '600',
    fontSize: 14,
  },
  timePillTextSelected: {
    color: '#fff',
  },
  // Estilos para Switch
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  // Estilos para Botões de Ação
  buttonRow: {
    marginTop: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButton: {
    backgroundColor: '#2ecc71', 
  },
  updateButton: {
    backgroundColor: '#f1c40f', 
  },
  cancelButton: {
    backgroundColor: '#e67e22', 
  },
  disabledButton: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Estilos para Listagem de Eventos/Consultas
  listContainer: {
    padding: 15,
    marginBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#95a5a6',
    fontStyle: 'italic',
    marginTop: 10,
  },
  eventCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  eventActions: {
    flexDirection: 'column',
    gap: 5,
  },
  eventDate: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  eventLocation: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 5,
  },
  eventObservation: {
    fontSize: 12,
    color: '#95a5a6',
  },
  editButton: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 5,
    backgroundColor: '#f1c40f',
  },
  deleteButton: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 5,
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Estilos Teleconsulta
  callContainer: {
    flex: 1,
    position:'relative',
    backgroundColor: '#333333',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 50,
  },
  middleContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callActiveContent: {
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },
  infoContainerActive: {
       alignItems: 'center',
       width: '100%',
       marginBottom: 30,
  },
  videoContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remoteVideoPlaceholder: {
       ...StyleSheet.absoluteFillObject,
       backgroundColor: '#004D40',
  },
  remoteVideoImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  localCameraPreview: {
    position: 'absolute',
    top: 50,
    right: 10,
    width: 90,
    height: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    alignItems: 'center',
    zIndex: 35,
  },
  statusText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '300',
  },
  nameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 5,
  },
  specialtyText: {
    fontSize: 18,
    color: '#BBBBBB',
  },
  doctorCircle: {
    width: 120,
    height: 120,
    borderRadius: 75,
    backgroundColor: '#3498DB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    zIndex: 20,
  },
  controlButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    width: '90%',
    zIndex: 40,
  },

  smallControlButton: {
    width: 55,
    height: 55,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 180,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 30,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Estilos Dependentes
  dependentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#2ecc71',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dependentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34495e',
  },
  dependentDetails: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#3498DB',
    padding: 15,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  // Estilos Documentos
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#9b59b6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  docInfo: {
    marginLeft: 15,
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
  },
  documentDetails: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  downloadButton: {
    backgroundColor: '#3498DB',
    padding: 10,
    borderRadius: 5,
  },
  // Estilos Tela de Erro
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginVertical: 15,
  },
  errorMessage: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#3498DB',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  // Estilos Conta/Perfil
  infoCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 5,
    borderLeftColor: '#3498DB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  infoValue: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: 'normal',
  },
  // Estilos ChatBot
  typingIndicator: {
    paddingHorizontal: 15,
    marginBottom: 5,
    alignSelf: 'flex-start',
  },
  typingText: {
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  sendButton: {
    backgroundColor: '#3498DB',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  chatInput: {
    flex: 1,
    height: 45,
    backgroundColor: '#fff',
    borderRadius: 22.5,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  // Estilos para seleção de Tipo Sanguíneo (SignUpScreen)
  bloodTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  bloodTypePill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#3498db',
  },
  bloodTypePillSelected: {
    backgroundColor: '#3498db',
  },
  bloodTypePillText: {
    color: '#3498DB',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bloodTypePillTextSelected: {
    color: '#fff',
  },
  // Fim dos Estilos ChatBot
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#3498DB',
    borderBottomRightRadius: 0,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#ecf0f1',
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 16,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#34495e',
  },
  messageList: {
    padding: 15,
    paddingBottom: 20,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inputContainerChat: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  // Estilos para LOGIN/SIGNUP
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f5f5f5',
  },
  logo: {
    fontFamily:'Merriweather',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#005088',
  },
  authTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#34495e',
  },
  authInput: {
    width: '100%',
    height: 55,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  authButton: {
    width: '100%',
    height: 55,
    backgroundColor: '#3498DB',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  authButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  authLink: {
    marginTop: 20,
    color: '#3498DB',
    fontSize: 16,
  },
});

export default App;