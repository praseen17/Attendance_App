import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Checkbox } from 'react-native-paper';
import { useRouter } from 'expo-router';

interface Student {
  id: string;
  name: string;
  rollNo: string;
  class: string;
  isPresent: boolean;
}

export default function AttendanceScreen() {
  const router = useRouter();
  const [selectedClass, setSelectedClass] = useState('CS Year 1');
  const [students, setStudents] = useState<Student[]>([
    { id: '1', name: 'John Smith', rollNo: 'CS001', class: 'CS Year 1', isPresent: false },
    { id: '2', name: 'Emma Johnson', rollNo: 'CS002', class: 'CS Year 1', isPresent: false },
    { id: '3', name: 'Michael Brown', rollNo: 'CS003', class: 'CS Year 1', isPresent: false },
    { id: '4', name: 'Sarah Davis', rollNo: 'CS004', class: 'CS Year 1', isPresent: false },
    { id: '5', name: 'David Wilson', rollNo: 'CS005', class: 'CS Year 1', isPresent: false },
    { id: '6', name: 'Lisa Anderson', rollNo: 'CS006', class: 'CS Year 1', isPresent: false },
  ]);

  const classes = ['CS Year 1', 'CS Year 2', 'CS Year 3', 'IT Year 1', 'IT Year 2'];

  const toggleAttendance = (studentId: string) => {
    setStudents(prev =>
      prev.map(student =>
        student.id === studentId
          ? { ...student, isPresent: !student.isPresent }
          : student
      )
    );
  };

  const saveAttendance = () => {
    const presentCount = students.filter(s => s.isPresent).length;
    const totalCount = students.length;

    Alert.alert(
      'Save Attendance',
      `Save attendance for ${selectedClass}?\n\nPresent: ${presentCount}/${totalCount} students`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Save', 
          onPress: () => {
            Alert.alert('Success', 'Attendance saved successfully!');
          }
        },
      ]
    );
  };

  const presentCount = students.filter(s => s.isPresent).length;
  const totalCount = students.length;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={{
              fontSize: 28,
              fontWeight: '700',
              color: '#1f2937',
              marginBottom: 4,
            }}>
              Attendance
            </Text>
            <Text style={{
              fontSize: 16,
              color: '#6b7280',
              fontWeight: '500',
            }}>
              Manual attendance marking
            </Text>
          </View>
        </View>
        
        {/* Camera Button - Positioned below */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          marginTop: 12,
        }}>
          <TouchableOpacity
            onPress={() => router.push('/camera')}
            style={{
              backgroundColor: '#10b981',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#10b981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <View style={{
              width: 10,
              height: 10,
              backgroundColor: '#ffffff',
              borderRadius: 5,
              marginRight: 8,
            }} />
            <Text style={{
              color: '#ffffff',
              fontSize: 14,
              fontWeight: '700',
              letterSpacing: 0.5,
            }}>
              Camera
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={{ flex: 1, padding: 20 }}>
        {/* Class Selection */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: 12,
          }}>
            Select Class
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {classes.map((className) => (
                <TouchableOpacity
                  key={className}
                  onPress={() => setSelectedClass(className)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    backgroundColor: selectedClass === className ? '#3b82f6' : '#f3f4f6',
                    borderWidth: 1,
                    borderColor: selectedClass === className ? '#3b82f6' : '#e5e7eb',
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: selectedClass === className ? '#ffffff' : '#374151',
                  }}>
                    {className}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Stats */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
          }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{
                fontSize: 32,
                fontWeight: '700',
                color: '#10b981',
              }}>
                {presentCount}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#6b7280',
                fontWeight: '500',
              }}>
                Present
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{
                fontSize: 32,
                fontWeight: '700',
                color: '#ef4444',
              }}>
                {totalCount - presentCount}
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#6b7280',
                fontWeight: '500',
              }}>
                Absent
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{
                fontSize: 32,
                fontWeight: '700',
                color: '#3b82f6',
              }}>
                {totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(0) : 0}%
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#6b7280',
                fontWeight: '500',
              }}>
                Rate
              </Text>
            </View>
          </View>
        </View>

        {/* Student List */}
        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: 16,
          }}>
            Students - {selectedClass}
          </Text>

          {students.map((student) => (
            <View
              key={student.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 12,
                paddingHorizontal: 16,
                marginBottom: 8,
                borderRadius: 8,
                backgroundColor: student.isPresent ? '#f0f9ff' : '#f8fafc',
                borderWidth: 1,
                borderColor: student.isPresent ? '#bfdbfe' : '#e2e8f0',
              }}
            >
              <Checkbox
                status={student.isPresent ? 'checked' : 'unchecked'}
                onPress={() => toggleAttendance(student.id)}
                color={student.isPresent ? '#3b82f6' : '#6b7280'}
                uncheckedColor="#6b7280"
              />
              
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#1f2937',
                }}>
                  {student.name}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#6b7280',
                }}>
                  {student.rollNo}
                </Text>
              </View>

              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: student.isPresent ? '#3b82f6' : '#6b7280',
              }}>
                {student.isPresent ? 'Present' : 'Absent'}
              </Text>
            </View>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={saveAttendance}
          style={{
            backgroundColor: '#3b82f6',
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: 'center',
            marginBottom: 40,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text style={{
            color: '#ffffff',
            fontSize: 18,
            fontWeight: '600',
          }}>
            Save Attendance
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}