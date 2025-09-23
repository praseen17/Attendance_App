import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  isPresent: boolean;
}

export default function ManualAttendanceScreen() {
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>([
    { id: '1', name: 'John Smith', rollNumber: 'CS001', isPresent: false },
    { id: '2', name: 'Emma Johnson', rollNumber: 'CS002', isPresent: false },
    { id: '3', name: 'Michael Brown', rollNumber: 'CS003', isPresent: false },
    { id: '4', name: 'Sarah Davis', rollNumber: 'CS004', isPresent: false },
    { id: '5', name: 'David Wilson', rollNumber: 'CS005', isPresent: false },
    { id: '6', name: 'Lisa Anderson', rollNumber: 'CS006', isPresent: false },
    { id: '7', name: 'James Taylor', rollNumber: 'CS007', isPresent: false },
    { id: '8', name: 'Jennifer Martinez', rollNumber: 'CS008', isPresent: false },
  ]);

  const classes = [
    'Computer Science - Year 1',
    'Computer Science - Year 2',
    'Computer Science - Year 3',
    'Information Technology - Year 1',
    'Information Technology - Year 2',
  ];

  const toggleAttendance = (studentId: string) => {
    setStudents(prev => 
      prev.map(student => 
        student.id === studentId 
          ? { ...student, isPresent: !student.isPresent }
          : student
      )
    );
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(student => ({ ...student, isPresent: true })));
  };

  const markAllAbsent = () => {
    setStudents(prev => prev.map(student => ({ ...student, isPresent: false })));
  };

  const saveAttendance = () => {
    if (!selectedClass) {
      Alert.alert('Error', 'Please select a class first');
      return;
    }

    const presentCount = students.filter(s => s.isPresent).length;
    const totalCount = students.length;

    Alert.alert(
      'Attendance Saved',
      `Successfully saved attendance for ${selectedClass}\nPresent: ${presentCount}/${totalCount} students`,
      [{ text: 'OK' }]
    );
  };

  const presentCount = students.filter(s => s.isPresent).length;
  const absentCount = students.length - presentCount;

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#ffffff',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
      }}>
        <Text style={{
          fontSize: 28,
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: 8,
        }}>
          Manual Attendance
        </Text>
        <Text style={{
          fontSize: 16,
          color: '#6b7280',
          fontWeight: '500',
        }}>
          Mark attendance manually for your class
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 24 }}>
          {/* Class Selection */}
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 20,
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
              Select Class & Date
            </Text>
            
            <View style={{
              flexDirection: isTablet ? 'row' : 'column',
              gap: 16,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: 8,
                }}>
                  Class
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 16 }}
                >
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {classes.map((className) => (
                      <TouchableOpacity
                        key={className}
                        onPress={() => setSelectedClass(className)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
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

              <View style={{ flex: isTablet ? 0.4 : 1 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: 8,
                }}>
                  Date
                </Text>
                <TextInput
                  value={selectedDate}
                  onChangeText={setSelectedDate}
                  style={{
                    borderWidth: 1,
                    borderColor: '#d1d5db',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 16,
                    backgroundColor: '#ffffff',
                  }}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 20,
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
              Quick Actions
            </Text>
            
            <View style={{
              flexDirection: 'row',
              gap: 12,
              marginBottom: 16,
            }}>
              <TouchableOpacity
                onPress={markAllPresent}
                style={{
                  flex: 1,
                  backgroundColor: '#10b981',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: 16,
                }}>
                  Mark All Present
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={markAllAbsent}
                style={{
                  flex: 1,
                  backgroundColor: '#ef4444',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: 16,
                }}>
                  Mark All Absent
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: '#f3f4f6',
            }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{
                  fontSize: 24,
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
                  fontSize: 24,
                  fontWeight: '700',
                  color: '#ef4444',
                }}>
                  {absentCount}
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
                  fontSize: 24,
                  fontWeight: '700',
                  color: '#3b82f6',
                }}>
                  {students.length}
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#6b7280',
                  fontWeight: '500',
                }}>
                  Total
                </Text>
              </View>
            </View>
          </View>

          {/* Student List */}
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 20,
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
              Student Attendance
            </Text>

            {students.map((student) => (
              <TouchableOpacity
                key={student.id}
                onPress={() => toggleAttendance(student.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  marginBottom: 8,
                  borderRadius: 12,
                  backgroundColor: student.isPresent ? '#f0fdf4' : '#fef2f2',
                  borderWidth: 1,
                  borderColor: student.isPresent ? '#bbf7d0' : '#fecaca',
                }}
              >
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: student.isPresent ? '#10b981' : '#ef4444',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                }}>
                  <Text style={{
                    color: '#ffffff',
                    fontSize: 16,
                    fontWeight: '600',
                  }}>
                    {student.isPresent ? '✓' : '✗'}
                  </Text>
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: 2,
                  }}>
                    {student.name}
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#6b7280',
                    fontWeight: '500',
                  }}>
                    Roll No: {student.rollNumber}
                  </Text>
                </View>
                
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: student.isPresent ? '#10b981' : '#ef4444',
                }}>
                  {student.isPresent ? 'Present' : 'Absent'}
                </Text>
              </TouchableOpacity>
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
              shadowColor: '#3b82f6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Text style={{
              color: '#ffffff',
              fontSize: 18,
              fontWeight: '700',
            }}>
              Save Attendance
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}