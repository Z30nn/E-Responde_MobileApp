import React, { FC, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useTheme, colors, fontSizes } from '../../services/themeContext';
import { createStyles } from './styles';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  const { isDarkMode, fontSize } = useTheme();
  const theme = isDarkMode ? colors.dark : colors.light;
  const fonts = fontSizes[fontSize];
  const styles = createStyles(theme, fonts, isDarkMode);

  const [showDropdown, setShowDropdown] = useState(false);

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageSelect = (page: number) => {
    onPageChange(page);
    setShowDropdown(false);
  };

  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, currentPage === 1 && styles.buttonDisabled]}
        onPress={handlePrevious}
        disabled={currentPage === 1}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, currentPage === 1 && styles.buttonTextDisabled]}>
          Previous
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.pageNumberButton}
        onPress={() => setShowDropdown(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.pageNumberText}>
          Page {currentPage} of {totalPages}
        </Text>
        <Text style={styles.dropdownArrow}>▼</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, currentPage === totalPages && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={currentPage === totalPages}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, currentPage === totalPages && styles.buttonTextDisabled]}>
          Next
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownTitle}>Select Page</Text>
            <FlatList
              data={pages}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    item === currentPage && styles.dropdownItemActive,
                  ]}
                  onPress={() => handlePageSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      item === currentPage && styles.dropdownItemTextActive,
                    ]}
                  >
                    Page {item}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.dropdownList}
              showsVerticalScrollIndicator={true}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default Pagination;

