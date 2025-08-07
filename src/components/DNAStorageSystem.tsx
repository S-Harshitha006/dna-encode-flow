import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  Download, 
  FileText, 
  BarChart3, 
  AlertCircle, 
  CheckCircle, 
  Dna,
  Zap,
  Clock,
  DollarSign
} from 'lucide-react';
import { 
  encodeToDeNA, 
  decodeFromDNA, 
  calculateStorageEfficiency,
  analyzeDNASequence,
  DNAEncodingResult,
  DNADecodingResult 
} from '@/utils/dnaStorage';

const DNAStorageSystem = () => {
  const [encodingResult, setEncodingResult] = useState<DNAEncodingResult | null>(null);
  const [decodingResult, setDecodingResult] = useState<DNADecodingResult | null>(null);
  const [isEncoding, setIsEncoding] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [dnaInput, setDnaInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast({
        title: "File Selected",
        description: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
      });
    }
  }, [toast]);

  const handleEncode = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to encode",
        variant: "destructive",
      });
      return;
    }

    setIsEncoding(true);
    try {
      const result = await encodeToDeNA(selectedFile);
      setEncodingResult(result);
      toast({
        title: "Encoding Complete",
        description: `File encoded to ${result.encodedSequence.length} DNA bases`,
      });
    } catch (error) {
      toast({
        title: "Encoding Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsEncoding(false);
    }
  };

  const handleDecode = () => {
    if (!dnaInput.trim()) {
      toast({
        title: "No DNA Sequence",
        description: "Please enter a DNA sequence to decode",
        variant: "destructive",
      });
      return;
    }

    setIsDecoding(true);
    try {
      const result = decodeFromDNA(dnaInput.trim());
      setDecodingResult(result);
      toast({
        title: result.isValid ? "Decoding Complete" : "Decoding Complete (with warnings)",
        description: result.isValid ? "Data integrity verified" : "Data may be corrupted",
        variant: result.isValid ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Decoding Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDecoding(false);
    }
  };

  const downloadEncodedData = () => {
    if (!encodingResult) return;
    
    const data = {
      sequence: encodingResult.encodedSequence,
      metadata: encodingResult.metadata,
      originalSize: encodingResult.originalSize,
      encodedSize: encodingResult.encodedSize
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${encodingResult.metadata.filename || 'data'}_dna_encoded.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDecodedData = () => {
    if (!decodingResult) return;
    
    const blob = new Blob([decodingResult.originalData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = decodingResult.metadata.filename || 'decoded_data';
    a.click();
    URL.revokeObjectURL(url);
  };

  const analysisData = encodingResult ? analyzeDNASequence(encodingResult.encodedSequence) : null;
  const efficiencyData = encodingResult ? calculateStorageEfficiency(
    encodingResult.originalSize, 
    encodingResult.encodedSize
  ) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Dna className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              DNA Data Storage System
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Convert digital files into DNA sequences for ultra-dense, long-term data storage
          </p>
        </div>

        <Tabs defaultValue="encode" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="encode" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Encode
            </TabsTrigger>
            <TabsTrigger value="decode" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Decode
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Encoding Tab */}
          <TabsContent value="encode" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    File Upload
                  </CardTitle>
                  <CardDescription>
                    Select a file to encode into DNA sequence
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                    <input
                      type="file"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg font-medium">
                        {selectedFile ? selectedFile.name : "Click to upload file"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedFile ? `${(selectedFile.size / 1024).toFixed(2)} KB` : "Any file type supported"}
                      </p>
                    </label>
                  </div>
                  
                  <Button 
                    onClick={handleEncode} 
                    disabled={!selectedFile || isEncoding}
                    className="w-full"
                    size="lg"
                  >
                    {isEncoding ? (
                      <>
                        <Zap className="h-4 w-4 mr-2 animate-spin" />
                        Encoding...
                      </>
                    ) : (
                      <>
                        <Dna className="h-4 w-4 mr-2" />
                        Encode to DNA
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {encodingResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Encoding Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Original Size</p>
                        <p className="text-lg font-semibold">{encodingResult.originalSize} bytes</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">DNA Length</p>
                        <p className="text-lg font-semibold">{encodingResult.encodedSize} bases</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Compression Ratio</p>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.min(100, (4 / encodingResult.compressionRatio) * 100)} className="flex-1" />
                        <Badge variant={encodingResult.compressionRatio < 3 ? "default" : "secondary"}>
                          {encodingResult.compressionRatio.toFixed(2)}:1
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">DNA Sequence Preview</p>
                      <div className="p-3 bg-muted rounded font-mono text-sm overflow-hidden">
                        {encodingResult.encodedSequence.substring(0, 100)}
                        {encodingResult.encodedSequence.length > 100 && '...'}
                      </div>
                    </div>

                    <Button onClick={downloadEncodedData} variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download DNA Data
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Decoding Tab */}
          <TabsContent value="decode" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dna className="h-5 w-5" />
                    DNA Sequence Input
                  </CardTitle>
                  <CardDescription>
                    Enter the DNA sequence to decode back to original data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Enter DNA sequence (A, T, G, C nucleotides)..."
                    value={dnaInput}
                    onChange={(e) => setDnaInput(e.target.value.toUpperCase())}
                    className="h-32 font-mono"
                  />
                  
                  <Button 
                    onClick={handleDecode} 
                    disabled={!dnaInput.trim() || isDecoding}
                    className="w-full"
                    size="lg"
                  >
                    {isDecoding ? (
                      <>
                        <Zap className="h-4 w-4 mr-2 animate-spin" />
                        Decoding...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Decode DNA
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {decodingResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {decodingResult.isValid ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                      Decoding Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!decodingResult.isValid && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Data integrity check failed. The decoded data may be corrupted.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Filename</p>
                        <p className="text-lg font-semibold">{decodingResult.metadata.filename || 'Unknown'}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">File Size</p>
                        <p className="text-lg font-semibold">{decodingResult.originalData.length} bytes</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Encoded Date</p>
                      <p className="text-sm">{new Date(decodingResult.metadata.timestamp).toLocaleString()}</p>
                    </div>

                    <Button onClick={downloadDecodedData} variant="outline" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Original File
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {analysisData && efficiencyData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Storage Efficiency
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Efficiency Rating</span>
                        <Badge variant={efficiencyData.efficiency === 'Excellent' ? 'default' : 'secondary'}>
                          {efficiencyData.efficiency}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Compression Ratio</span>
                        <span className="font-semibold">{efficiencyData.compressionRatio.toFixed(2)}:1</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Space Change</span>
                        <span className={`font-semibold ${efficiencyData.spaceSaving > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {efficiencyData.spaceSaving > 0 ? '+' : ''}{efficiencyData.spaceSaving.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Dna className="h-5 w-5" />
                      Sequence Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Length</span>
                        <span className="font-semibold">{analysisData.length.toLocaleString()} bases</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">GC Content</span>
                        <span className="font-semibold">{analysisData.gcContent.toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Nucleotide Distribution</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">A</div>
                          <div className="text-sm font-semibold">{analysisData.nucleotideCounts.A}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">T</div>
                          <div className="text-sm font-semibold">{analysisData.nucleotideCounts.T}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">G</div>
                          <div className="text-sm font-semibold">{analysisData.nucleotideCounts.G}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">C</div>
                          <div className="text-sm font-semibold">{analysisData.nucleotideCounts.C}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Cost Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Synthesis Cost</span>
                        <span className="font-semibold">${analysisData.estimatedSynthesisCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Cost per KB</span>
                        <span className="font-semibold">
                          ${(analysisData.estimatedSynthesisCost / (encodingResult!.originalSize / 1024)).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Storage Duration</span>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          1000+ years
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Data to Analyze</h3>
                  <p className="text-muted-foreground">Encode a file first to view analytics and statistics.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DNAStorageSystem;