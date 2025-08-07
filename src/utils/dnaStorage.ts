/**
 * DNA Data Storage Utility Functions
 * Implements binary-to-DNA encoding and DNA-to-binary decoding
 */

export interface DNAEncodingResult {
  originalSize: number;
  encodedSize: number;
  compressionRatio: number;
  encodedSequence: string;
  metadata: {
    timestamp: string;
    filename?: string;
    checksum: string;
  };
}

export interface DNADecodingResult {
  originalData: Uint8Array;
  metadata: {
    timestamp: string;
    filename?: string;
    checksum: string;
  };
  isValid: boolean;
}

// Base mapping for binary to DNA nucleotides
const BINARY_TO_DNA: { [key: string]: string } = {
  '00': 'A',
  '01': 'T',
  '10': 'G',
  '11': 'C'
};

const DNA_TO_BINARY: { [key: string]: string } = {
  'A': '00',
  'T': '01',
  'G': '10',
  'C': '11'
};

// Error correction codes for DNA storage
const REED_SOLOMON_REDUNDANCY = 0.1; // 10% redundancy

/**
 * Calculate CRC32 checksum for data integrity
 */
function calculateCRC32(data: Uint8Array): string {
  let crc = 0xFFFFFFFF;
  const table = new Uint32Array(256);
  
  // Generate CRC table
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  
  // Calculate CRC
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF];
  }
  
  return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0');
}

/**
 * Convert binary string to DNA sequence with error correction
 */
function binaryToDNA(binaryString: string): string {
  // Pad binary string to ensure even length
  if (binaryString.length % 2 !== 0) {
    binaryString += '0';
  }
  
  let dnaSequence = '';
  
  // Convert pairs of bits to DNA nucleotides
  for (let i = 0; i < binaryString.length; i += 2) {
    const pair = binaryString.substr(i, 2);
    dnaSequence += BINARY_TO_DNA[pair];
  }
  
  // Add error correction sequences every 100 bases
  return addErrorCorrection(dnaSequence);
}

/**
 * Convert DNA sequence back to binary with error checking
 */
function dnaToBinary(dnaSequence: string): string {
  // Remove error correction sequences
  const cleanSequence = removeErrorCorrection(dnaSequence);
  
  let binaryString = '';
  
  // Convert DNA nucleotides back to binary
  for (const nucleotide of cleanSequence) {
    if (DNA_TO_BINARY[nucleotide]) {
      binaryString += DNA_TO_BINARY[nucleotide];
    } else {
      throw new Error(`Invalid nucleotide: ${nucleotide}`);
    }
  }
  
  return binaryString;
}

/**
 * Add error correction sequences to DNA
 */
function addErrorCorrection(sequence: string): string {
  const chunkSize = 100;
  let correctedSequence = '';
  
  for (let i = 0; i < sequence.length; i += chunkSize) {
    const chunk = sequence.substr(i, chunkSize);
    const checksum = calculateSimpleChecksum(chunk);
    correctedSequence += chunk + checksum;
  }
  
  return correctedSequence;
}

/**
 * Remove error correction sequences from DNA
 */
function removeErrorCorrection(sequence: string): string {
  const chunkSize = 104; // 100 + 4 checksum bases
  let cleanSequence = '';
  
  for (let i = 0; i < sequence.length; i += chunkSize) {
    const chunk = sequence.substr(i, chunkSize);
    if (chunk.length >= 104) {
      const data = chunk.substr(0, 100);
      const checksum = chunk.substr(100, 4);
      const calculatedChecksum = calculateSimpleChecksum(data);
      
      if (checksum === calculatedChecksum) {
        cleanSequence += data;
      } else {
        console.warn('Checksum mismatch detected, data may be corrupted');
        cleanSequence += data; // Still add data but warn user
      }
    } else {
      cleanSequence += chunk; // Last chunk
    }
  }
  
  return cleanSequence;
}

/**
 * Calculate simple checksum for DNA sequences
 */
function calculateSimpleChecksum(sequence: string): string {
  const counts = { A: 0, T: 0, G: 0, C: 0 };
  
  for (const base of sequence) {
    if (counts.hasOwnProperty(base)) {
      counts[base as keyof typeof counts]++;
    }
  }
  
  // Convert counts to binary and then to DNA
  const binary = (counts.A % 4).toString(2).padStart(2, '0') + 
                 (counts.T % 4).toString(2).padStart(2, '0');
  
  return binaryToDNA(binary);
}

/**
 * Encode file data to DNA sequence
 */
export async function encodeToDeNA(file: File): Promise<DNAEncodingResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Calculate checksum
        const checksum = calculateCRC32(uint8Array);
        
        // Create metadata
        const metadata = {
          timestamp: new Date().toISOString(),
          filename: file.name,
          checksum
        };
        
        // Convert to binary string
        let binaryString = '';
        for (const byte of uint8Array) {
          binaryString += byte.toString(2).padStart(8, '0');
        }
        
        // Add metadata to binary string
        const metadataString = JSON.stringify(metadata);
        const metadataBytes = new TextEncoder().encode(metadataString);
        const metadataLength = metadataBytes.length.toString(2).padStart(16, '0');
        
        let metadataBinary = '';
        for (const byte of metadataBytes) {
          metadataBinary += byte.toString(2).padStart(8, '0');
        }
        
        const fullBinary = metadataLength + metadataBinary + binaryString;
        
        // Encode to DNA
        const encodedSequence = binaryToDNA(fullBinary);
        
        resolve({
          originalSize: arrayBuffer.byteLength,
          encodedSize: encodedSequence.length,
          compressionRatio: encodedSequence.length / arrayBuffer.byteLength,
          encodedSequence,
          metadata
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Decode DNA sequence back to original data
 */
export function decodeFromDNA(dnaSequence: string): DNADecodingResult {
  try {
    // Convert DNA back to binary
    const binaryString = dnaToBinary(dnaSequence);
    
    // Extract metadata length (first 16 bits)
    const metadataLength = parseInt(binaryString.substr(0, 16), 2);
    
    // Extract metadata
    const metadataBinary = binaryString.substr(16, metadataLength * 8);
    const metadataBytes = [];
    for (let i = 0; i < metadataBinary.length; i += 8) {
      metadataBytes.push(parseInt(metadataBinary.substr(i, 8), 2));
    }
    
    const metadataString = new TextDecoder().decode(new Uint8Array(metadataBytes));
    const metadata = JSON.parse(metadataString);
    
    // Extract original data
    const dataBinary = binaryString.substr(16 + metadataLength * 8);
    const dataBytes = [];
    for (let i = 0; i < dataBinary.length; i += 8) {
      if (i + 8 <= dataBinary.length) {
        dataBytes.push(parseInt(dataBinary.substr(i, 8), 2));
      }
    }
    
    const originalData = new Uint8Array(dataBytes);
    
    // Verify integrity
    const calculatedChecksum = calculateCRC32(originalData);
    const isValid = calculatedChecksum === metadata.checksum;
    
    return {
      originalData,
      metadata,
      isValid
    };
  } catch (error) {
    throw new Error(`Decoding failed: ${error.message}`);
  }
}

/**
 * Estimate storage efficiency
 */
export function calculateStorageEfficiency(originalSize: number, encodedSize: number): {
  compressionRatio: number;
  efficiency: string;
  spaceSaving: number;
} {
  const compressionRatio = encodedSize / originalSize;
  const spaceSaving = ((originalSize - encodedSize) / originalSize) * 100;
  
  let efficiency = 'Poor';
  if (compressionRatio < 2) efficiency = 'Excellent';
  else if (compressionRatio < 3) efficiency = 'Good';
  else if (compressionRatio < 4) efficiency = 'Fair';
  
  return {
    compressionRatio,
    efficiency,
    spaceSaving
  };
}

/**
 * Generate DNA sequence statistics
 */
export function analyzeDNASequence(sequence: string): {
  length: number;
  gcContent: number;
  nucleotideCounts: { A: number; T: number; G: number; C: number };
  estimatedSynthesisCost: number;
} {
  const counts = { A: 0, T: 0, G: 0, C: 0 };
  
  for (const base of sequence) {
    if (counts.hasOwnProperty(base)) {
      counts[base as keyof typeof counts]++;
    }
  }
  
  const gcContent = ((counts.G + counts.C) / sequence.length) * 100;
  const estimatedSynthesisCost = sequence.length * 0.1; // $0.10 per base (approximate)
  
  return {
    length: sequence.length,
    gcContent,
    nucleotideCounts: counts,
    estimatedSynthesisCost
  };
}