import React, { FC } from 'react';
import CrimeReportFormComponent from '../../../CrimeReportForm';

interface CrimeReportFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const CrimeReportForm: FC<CrimeReportFormProps> = ({ onClose, onSuccess }) => {
  return <CrimeReportFormComponent onClose={onClose} onSuccess={onSuccess} />;
};

export default CrimeReportForm;

