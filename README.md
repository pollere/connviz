# connviz - view connmon output in a browser

## Summary

`connviz` is a web-based visualizer for `connmon`. `connviz` uses
output from connmon run with the -m flag. The output lines are 
piped to a nodejs program: collectChunk.js recommended for live input
and line2Chunk.js recommended for pcap file input. The nodejs programs
create a server to which a browser window is connected using index.html
in this directory.

connviz displays six subplots, three stacked on each side. The round trip
delay of ppings is in the first row, seqno rtds in the second row and
out-of-order seqnos and dup acks in the third row. There are two columns,
one for each "side" of the CP. If the CP is on a host, one side may not
be that interesting.

RTDs are colored by host, information can be seen by hovering over the
symbols. Sequence number holes are open circles above the zero line.
Earlier sequence numbers are shown as open squares below the zero line.
When a duplicate ack is detected, a dot of its host color is shown on
the zero line (this information may or may not be useful).

## Usage

To invoke `connviz` on a live connmon, get `connmon` and the collectChunk nodejs
program. Then, from the command line,
`connmon -m -i [interface] | node collectChunk.js`
and from a browser window open index.html.

To invoke `connviz` on a saved pcap file,
`connmon -m -r [filename].pcap | node line2Chunk.js`

## Examples

This directory contains an example output, connviz.pdf.

## See Also

`connmon` at https://github/pollere/connmon.
`collectChunk` at https://github/pollere/collectChunk.
`line2Chunk` at https://github/pollere/line2Chunk.

## Author

Kathleen Nichols <nichols@pollere.net>.

## Copyright

Copyright (c) 2018, Kathleen Nichols <nichols@pollere.net>.

Licensed under the GNU GPLv3. See LICENSE for more details.
