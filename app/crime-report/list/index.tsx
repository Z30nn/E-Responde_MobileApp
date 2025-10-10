import React, { FC } from 'react';
import CrimeReportsListComponent from '../../../CrimeReportsList';

interface CrimeReportsListProps {
  onViewReport: (reportId: string) => void;
  selectedStatus: string;
}

const CrimeReportsList: FC<CrimeReportsListProps> = ({ onViewReport, selectedStatus }) => {
  return <CrimeReportsListComponent onViewReport={onViewReport} selectedStatus={selectedStatus} />;
};

export default CrimeReportsList;

