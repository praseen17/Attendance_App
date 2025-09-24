import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Checkbox } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { renderIcon } from '@/constants/icons';
import { Colors } from '@/constants/theme';

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
  const [showDatePicker, setShowDatePicker] = useState(false);
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
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
      }}>
        <Text style={{
          fontSize: 24,
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: 4,
        }}>
          Manual Attendance
        </Text>
        <Text style={{
          fontSize: 14,
          color: '#64748b',
        }}>
          Mark attendance for your class
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 24 }}>
          {/* Class Selection */}
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#e2e8f0',
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: 12,
            }}>
              Class & Date
            </Text>
            
            <View style={{
              flexDirection: isTablet ? 'row' : 'column',
              gap: 16,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: '#64748b',
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
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 6,
                          backgroundColor: selectedClass === className ? '#3b82f6' : '#f1f5f9',
                          borderWidth: 1,
                          borderColor: selectedClass === className ? '#3b82f6' : '#e2e8f0',
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          fontWeight: '500',
                          color: selectedClass === className ? '#ffffff' : '#475569',
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
                  color: '#64748b',
                  marginBottom: 8,
                }}>
                  Date
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    borderRadius: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: '#ffffff',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    color: '#1e293b',
                  }}>
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                  <Text style={{
                    fontSize: 16,
                    color: '#64748b',
                  }}>
                    📅
                  </Text>
                </TouchableOpacity>
                
                {showDatePicker && (
                  <View style={{
                    position: 'absolute',
                    top: 60,
                    left: -20,
                    right: -20,
                    backgroundColor: '#ffffff',
                    borderRadius: 12,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 12,
                    elevation: 8,
                    zIndex: 1000,
                  }}>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: '#1e293b',
                      marginBottom: 16,
                      textAlign: 'center',
                    }}>
                      Select Date
                    </Text>
                    
                    <Calendar
                      current={selectedDate}
                      onDayPress={(day) => {
                        setSelectedDate(day.dateString);
                        setShowDatePicker(false);
                      }}
                      monthFormat={'MMMM yyyy'}
                      onMonthChange={(month) => {
                        console.log('month changed', month);
                      }}
                      hideExtraDays={true}
                      disableMonthChange={false}
                      firstDay={1}
                      hideDayNames={false}
                      showWeekNumbers={false}
                      onPressArrowLeft={(subtractMonth) => subtractMonth()}
                      onPressArrowRight={(addMonth) => addMonth()}
                      disableArrowLeft={false}
                      disableArrowRight={false}
                      disableAllTouchEventsForDisabledDays={true}
                      enableSwipeMonths={true}
                      theme={{
                        backgroundColor: '#ffffff',
                        calendarBackground: '#ffffff',
                        textSectionTitleColor: '#64748b',
                        textSectionTitleDisabledColor: '#d9d9d9',
                        selectedDayBackgroundColor: '#3b82f6',
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: '#3b82f6',
                        dayTextColor: '#1e293b',
                        textDisabledColor: '#d9d9d9',
                        dotColor: '#3b82f6',
                        selectedDotColor: '#ffffff',
                        arrowColor: '#3b82f6',
                        disabledArrowColor: '#d9d9d9',
                        monthTextColor: '#1e293b',
                        indicatorColor: '#3b82f6',
                        textDayFontWeight: '500',
                        textMonthFontWeight: '600',
                        textDayHeaderFontWeight: '500',
                        textDayFontSize: 16,
                        textMonthFontSize: 18,
                        textDayHeaderFontSize: 14,
                        'stylesheet.calendar.header': {
                          week: {
                            marginTop: 7,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                          }
                        }
                      }}
                      markedDates={{
                        [selectedDate]: {
                          selected: true,
                          selectedColor: '#3b82f6',
                          selectedTextColor: '#ffffff',
                        }
                      }}
                    />
                    
                    <View style={{
                      flexDirection: 'row',
                      gap: 12,
                      marginTop: 16,
                      paddingTop: 16,
                      borderTopWidth: 1,
                      borderTopColor: '#e2e8f0',
                    }}>
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedDate(new Date().toISOString().split('T')[0]);
                          setShowDatePicker(false);
                        }}
                        style={{
                          flex: 1,
                          backgroundColor: '#f1f5f9',
                          paddingVertical: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{
                          color: '#64748b',
                          fontSize: 14,
                          fontWeight: '500',
                        }}>
                          Today
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                        style={{
                          flex: 1,
                          backgroundColor: '#3b82f6',
                          paddingVertical: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{
                          color: '#ffffff',
                          fontSize: 14,
                          fontWeight: '500',
                        }}>
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#e2e8f0',
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: 12,
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
                  paddingVertical: 10,
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: '#ffffff',
                  fontWeight: '500',
                  fontSize: 14,
                }}>
                  Mark All Present
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={markAllAbsent}
                style={{
                  flex: 1,
                  backgroundColor: '#ef4444',
                  paddingVertical: 10,
                  borderRadius: 6,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: '#ffffff',
                  fontWeight: '500',
                  fontSize: 14,
                }}>
                  Mark All Absent
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: '#e2e8f0',
            }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '600',
                  color: '#10b981',
                }}>
                  {presentCount}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: '#64748b',
                }}>
                  Present
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '600',
                  color: '#ef4444',
                }}>
                  {absentCount}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: '#64748b',
                }}>
                  Absent
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '600',
                  color: '#3b82f6',
                }}>
                  {students.length}
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: '#64748b',
                }}>
                  Total
                </Text>
              </View>
            </View>
          </View>

          {/* Student List */}
          <View style={{
            backgroundColor: '#ffffff',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#e2e8f0',
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#1e293b',
              marginBottom: 12,
            }}>
              Students
            </Text>

            {students.map((student) => (
              <View
                key={student.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  marginBottom: 6,
                  borderRadius: 6,
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
                    fontSize: 15,
                    fontWeight: '500',
                    color: '#1e293b',
                    marginBottom: 2,
                  }}>
                    {student.name}
                  </Text>
                  <Text style={{
                    fontSize: 13,
                    color: '#64748b',
                  }}>
                    Roll No: {student.rollNumber}
                  </Text>
                </View>
                
                <Text style={{
                  fontSize: 13,
                  fontWeight: '500',
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
              paddingVertical: 14,
              borderRadius: 8,
              alignItems: 'center',
              marginBottom: 40,
            }}
          >
            <Text style={{
              color: '#ffffff',
              fontSize: 16,
              fontWeight: '600',
            }}>
              Save Attendance
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}