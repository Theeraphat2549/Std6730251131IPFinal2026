import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Employee {
  id: string;
  name: string;
  position: string;
  status: 'Active' | 'On Leave';
  salary: number;
}

const API_BASE_URL = 'http://localhost:3085/api';

export default function SearchEmployeeScreen() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลพนักงานทั้งหมดจาก Backend API
  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/employees`);
      const data = await response.json();
      if (Array.isArray(data)) {
        const formatted: Employee[] = data.map((item: any) => ({
          id: String(item.id || item._id || Date.now()),
          name: item.name || 'Unknown',
          position: item.position || 'Staff',
          status: item.status || 'Active',
          salary: Number(item.salary || 0),
        }));
        setEmployees(formatted);
      }
    } catch (err) {
      console.log('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // กรองรายชื่อพนักงานตามคำค้นหา (ค้นหาจากชื่อ หรือ ตำแหน่ง)
  const filteredEmployees = employees.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={() => router.push('/')}>
            <Text style={styles.backBtnText}>← Back to Dashboard</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Search Employee</Text>
        </View>
      </View>

      {/* Search Bar Input */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by employee name or position..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#0F172A" />
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const isActive = item.status === 'Active';
            return (
              <View style={styles.card}>
                <View style={styles.infoContainer}>
                  <Text numberOfLines={1} style={styles.empName}>{item.name}</Text>
                  <Text style={styles.empPosition}>{item.position}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.empSalary}>฿{item.salary.toLocaleString()}</Text>
                    <Text style={[styles.empStatus, { color: isActive ? '#166534' : '#C2410C' }]}>
                      ● {item.status}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>ไม่พบรายชื่อพนักงานที่คุณค้นหา</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerWrapper: { width: '100%', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center' },
  header: { width: '100%', maxWidth: 700, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 16 },
  backBtn: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
  backBtnText: { color: '#0F172A', fontSize: 12, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  
  searchBarContainer: { width: '100%', maxWidth: 700, alignSelf: 'center', paddingHorizontal: 16, marginTop: 16 },
  searchInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F172A', shadowColor: '#64748B', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },

  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16, width: '100%', maxWidth: 700, alignSelf: 'center' },
  
  card: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, marginBottom: 12, shadowColor: '#64748B', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  infoContainer: { flex: 1 },
  empName: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
  empPosition: { fontSize: 12, color: '#64748B', marginBottom: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  empSalary: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  empStatus: { fontSize: 11, fontWeight: '700' },
  
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontSize: 14 },
});